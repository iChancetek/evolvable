import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { adminDb } from '@/lib/firebase/admin';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * GET /api/github/actions
 * Fetches workflow runs for the project's linked GitHub repository.
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
        const token = await tokenService.getToken();

        if (!token) {
            return NextResponse.json({ error: 'GitHub not connected', runs: [] }, { status: 401 });
        }

        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const project = projectDoc.data() as ProjectBlueprint;
        const repoFullName = project.github?.repoFullName;

        if (!repoFullName) {
            return NextResponse.json({ runs: [], message: 'No repository linked' });
        }

        // Fetch workflow runs from GitHub Actions API
        const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs?per_page=20`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Evolvable-Platform',
            },
        });

        if (!ghRes.ok) {
            const errData = await ghRes.json().catch(() => ({}));
            return NextResponse.json({ error: errData.message || 'Failed to fetch workflow runs', runs: [] }, { status: ghRes.status });
        }

        const ghData = await ghRes.json();

        const runs = (ghData.workflow_runs || []).map((run: any) => ({
            id: run.id,
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            headSha: run.head_sha,
            createdAt: run.created_at,
            htmlUrl: run.html_url,
            runNumber: run.run_number,
        }));

        return NextResponse.json({ runs });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/github/actions
 * Re-runs a workflow by run ID.
 * Body: { userId, projectId, runId }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, projectId, runId } = body;

        if (!userId || !projectId || !runId) {
            return NextResponse.json({ error: 'userId, projectId, and runId required' }, { status: 400 });
        }

        const tokenService = new GitHubTokenService(userId);
        const token = await tokenService.getToken();

        if (!token) {
            return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });
        }

        const projectDoc = await adminDb.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        const project = projectDoc.data() as ProjectBlueprint;
        const repoFullName = project.github?.repoFullName;

        if (!repoFullName) {
            return NextResponse.json({ error: 'No repository linked' }, { status: 400 });
        }

        // Re-run the workflow
        const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs/${runId}/rerun`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Evolvable-Platform',
            },
        });

        if (!ghRes.ok) {
            const errData = await ghRes.json().catch(() => ({}));
            return NextResponse.json({ error: errData.message || 'Re-run failed' }, { status: ghRes.status });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
