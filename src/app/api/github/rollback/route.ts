import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { GitHubIntegrationService } from '@/lib/github/github-service';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * POST /api/github/rollback
 * Creates a hotfix/rollback-v{version} branch from a target commit SHA and opens a PR.
 * Body: { userId: string, projectId: string, commitSha: string, version: number }
 */
export async function POST(req: NextRequest) {
    try {
        const { userId, projectId, commitSha, version } = await req.json();

        if (!userId || !projectId || !commitSha || !version) {
            return NextResponse.json({ error: 'userId, projectId, commitSha, version required' }, { status: 400 });
        }

        const tokenService = new GitHubTokenService(userId);
        const token = await tokenService.getToken();
        if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });

        const doc = await adminDb.collection('projects').doc(projectId).get();
        if (!doc.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const project = doc.data() as ProjectBlueprint;
        if (!project.github?.repoFullName) {
            return NextResponse.json({ error: 'No GitHub repo linked to this project' }, { status: 400 });
        }

        const gis = new GitHubIntegrationService(token);
        const { branchName, prNumber, prUrl } = await gis.createRollbackBranch(
            project.github.repoFullName,
            commitSha,
            version
        );

        // Update project with rollback PR info
        await adminDb.collection('projects').doc(projectId).update({
            'github.openPrNumber': prNumber,
            'github.openPrUrl': prUrl,
            'github.currentBranch': branchName,
            'github.mergedAt': null   // Re-lock deployment until PR merged
        });

        const auditLogger = new AuditLogger(projectId);
        await auditLogger.log('rollback_initiated', `Rollback to v${version} initiated — PR #${prNumber}`, {
            userId,
            planVersion: version,
            metadata: { branchName, commitSha, prNumber, prUrl }
        });

        return NextResponse.json({
            success: true,
            branchName,
            prNumber,
            prUrl,
            message: `Rollback branch '${branchName}' created. PR #${prNumber} opened.`
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
