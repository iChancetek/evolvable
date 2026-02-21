import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { GitHubIntegrationService } from '@/lib/github/github-service';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * POST /api/github/pr/merge
 * Merges the open PR and unlocks deployment.
 * Body: { userId: string, projectId: string, prNumber: number }
 */
export async function POST(req: NextRequest) {
    try {
        const { userId, projectId, prNumber } = await req.json();

        if (!userId || !projectId || !prNumber) {
            return NextResponse.json({ error: 'userId, projectId, prNumber required' }, { status: 400 });
        }

        const tokenService = new GitHubTokenService(userId);
        const token = await tokenService.getToken();
        if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });

        const projectRef = adminDb.collection('projects').doc(projectId);
        const doc = await projectRef.get();
        if (!doc.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const project = doc.data() as ProjectBlueprint;
        if (!project.github?.repoFullName) {
            return NextResponse.json({ error: 'No GitHub repo linked to this project' }, { status: 400 });
        }

        const gis = new GitHubIntegrationService(token);
        const mergeCommitSha = await gis.mergePullRequest(project.github.repoFullName, prNumber);

        const mergedAt = Date.now();
        await projectRef.update({
            'github.mergedAt': mergedAt,
            'github.latestCommitSha': mergeCommitSha,
            'github.openPrNumber': null,
            'github.openPrUrl': null,
            status: 'deployed'
        });

        const auditLogger = new AuditLogger(projectId);
        await auditLogger.log('pr_merged', `PR #${prNumber} merged — deployment unlocked`, {
            userId,
            planVersion: project.activePlanVersion,
            metadata: { prNumber, mergeCommitSha }
        });

        return NextResponse.json({
            success: true,
            message: `PR #${prNumber} merged. Project is now ready to deploy.`,
            mergeCommitSha
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
