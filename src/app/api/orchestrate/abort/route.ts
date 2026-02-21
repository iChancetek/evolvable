import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orchestrate/abort
 * Aborts an ongoing AI orchestration pipeline by setting the project status to 'failed'.
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const projectRef = adminDb.collection('projects').doc(projectId);

        // Setting status to 'error' and currentPhase to 'completed' will cause
        // the OrchestrationBus to halt its execution loop naturally on the next tick.
        await projectRef.update({
            status: 'error',
            currentPhase: 'completed',
        });

        return NextResponse.json({
            success: true,
            message: 'Pipeline aborted.'
        });

    } catch (error: any) {
        console.error('Orchestration Abort API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
