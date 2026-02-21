import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { ProjectBlueprint } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orchestrate/status
 * Fetches the real-time status of the project blueprint from Firestore.
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        const projectRef = adminDb.collection('projects').doc(projectId);
        const docSnap = await projectRef.get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const blueprint = docSnap.data() as ProjectBlueprint;

        return NextResponse.json({
            success: true,
            blueprint
        });

    } catch (error: any) {
        console.error('Status API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
