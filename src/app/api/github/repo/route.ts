import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { GitHubIntegrationService } from '@/lib/github/github-service';
import { adminDb } from '@/lib/firebase/admin';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * GET /api/github/repo
 * Returns repo metadata, branches, open PRs, and last 10 commits for a project.
 * ?userId=&projectId=
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const projectId = searchParams.get('projectId');

        if (!userId || !projectId) {
            return NextResponse.json({ error: 'userId and projectId required' }, { status: 400 });
        }

        const tokenService = new GitHubTokenService(userId);
        const [token, record] = await Promise.all([tokenService.getToken(), tokenService.getRecord()]);

        if (!token) {
            return NextResponse.json({ error: 'GitHub not connected', connected: false }, { status: 401 });
        }

        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const project = projectDoc.data() as ProjectBlueprint;
        const github = project.github;

        if (!github?.repoFullName) {
            return NextResponse.json({
                connected: true,
                githubAccount: record,
                repo: null,
                message: 'No repository linked to this project yet.'
            });
        }

        const gis = new GitHubIntegrationService(token);
        const repoInfo = await gis.getRepositoryInfo(github.repoFullName);

        return NextResponse.json({
            connected: true,
            githubAccount: record,
            repo: {
                fullName: github.repoFullName,
                url: github.repoUrl,
                currentBranch: github.currentBranch,
                openPrNumber: github.openPrNumber,
                openPrUrl: github.openPrUrl,
                latestCommitSha: github.latestCommitSha,
                mergedAt: github.mergedAt,
                ...repoInfo
            }
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
