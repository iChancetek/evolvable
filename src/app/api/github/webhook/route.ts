import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as crypto from 'crypto';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

function verifySignature(payload: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) return false;
    const expected = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * POST /api/github/webhook
 * Receives GitHub webhook events.
 * Handles:
 *   - pull_request.closed (merged) → unlock deployment
 *   - pull_request.closed (rejected) → return to planning
 *   - delete (branch/repo) → alert user
 */
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';
    const event = req.headers.get('x-github-event') || '';

    if (!verifySignature(rawBody, signature)) {
        console.warn('[GitHub Webhook] Invalid signature — rejected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    try {
        if (event === 'pull_request') {
            const action = payload.action;
            const pr = payload.pull_request;
            const repoFullName: string = payload.repository?.full_name;

            if (action === 'closed') {
                // Find project by repo name
                const query = await adminDb.collection('projects')
                    .where('github.repoFullName', '==', repoFullName)
                    .limit(1)
                    .get();

                if (query.empty) {
                    console.warn(`[Webhook] No project found for repo: ${repoFullName}`);
                    return NextResponse.json({ ok: true });
                }

                const projectDoc = query.docs[0];
                const projectId = projectDoc.id;

                if (pr.merged) {
                    // PR merged → unlock deployment
                    await projectDoc.ref.update({
                        'github.mergedAt': Date.now(),
                        'github.latestCommitSha': pr.merge_commit_sha,
                        'github.openPrNumber': null,
                        'github.openPrUrl': null,
                        status: 'deployed'
                    });
                    await adminDb.collection('auditLog').add({
                        event: 'pr_merged',
                        timestamp: Date.now(),
                        projectId,
                        description: `PR #${pr.number} merged via GitHub webhook`,
                        metadata: { prNumber: pr.number, mergeCommitSha: pr.merge_commit_sha }
                    });
                    console.log(`[Webhook] PR #${pr.number} merged — deployment unlocked for ${repoFullName}`);

                } else {
                    // PR closed without merge → return to planning
                    await projectDoc.ref.update({
                        status: 'awaiting_approval',
                        phase: 'awaiting_approval',
                        'github.openPrNumber': null,
                        'github.openPrUrl': null
                    });
                    await adminDb.collection('auditLog').add({
                        event: 'plan_revision_requested',
                        timestamp: Date.now(),
                        projectId,
                        description: `PR #${pr.number} closed without merge — returned to planning`,
                        metadata: { prNumber: pr.number, reason: 'pr_rejected' }
                    });
                    console.log(`[Webhook] PR #${pr.number} rejected — project returned to planning`);
                }
            }
        }

        if (event === 'delete') {
            const refType = payload.ref_type; // 'branch' or 'repository'
            const repoFullName: string = payload.repository?.full_name;

            if (refType === 'repository') {
                const query = await adminDb.collection('projects')
                    .where('github.repoFullName', '==', repoFullName)
                    .limit(1)
                    .get();

                if (!query.empty) {
                    const projectDoc = query.docs[0];
                    await projectDoc.ref.update({ 'github.repoFullName': null, 'github.repoUrl': null });
                    await adminDb.collection('auditLog').add({
                        event: 'plan_drift',
                        timestamp: Date.now(),
                        projectId: projectDoc.id,
                        description: `GitHub repository '${repoFullName}' was deleted externally`,
                        metadata: { repoFullName }
                    });
                    console.warn(`[Webhook] Repository deleted externally: ${repoFullName}`);
                }
            }
        }

        return NextResponse.json({ ok: true });

    } catch (err: any) {
        console.error('[Webhook] Error processing event:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
