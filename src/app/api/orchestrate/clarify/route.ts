import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { OrchestrationBus } from '@/lib/agents/orchestration-bus';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * POST /api/orchestrate/clarify
 * Handles user clarifications for the NLP Infrastructure pipeline pause.
 * Appends the clarification to the blueprint's original prompt and restarts the planning phase.
 *
 * Body: { projectId: string, userId: string, clarificationNotes: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, userId, clarificationNotes } = await req.json();

        if (!projectId || !userId || !clarificationNotes) {
            return NextResponse.json({ error: 'Missing required fields: projectId, userId, clarificationNotes' }, { status: 400 });
        }

        const ref = adminDb.collection('projects').doc(projectId);
        const doc = await ref.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const project = doc.data() as ProjectBlueprint;

        if (project.phase !== 'awaiting_clarification') {
            return NextResponse.json({
                error: `Cannot clarify: project phase is '${project.phase}'. Only projects awaiting clarification can be clarified.`
            }, { status: 409 });
        }

        // Reset planning outputs so agents regenerate from scratch
        await ref.update({
            infrastructure: null,
            prd: null,
            databaseSchema: null,
            architecture: null,
            status: 'building',
            phase: 'planning'
        });

        // Audit log
        const auditLogger = new AuditLogger(projectId);
        await auditLogger.log('infra_clarified', 'User provided clarification for infrastructure generation', {
            userId,
            metadata: { notes: clarificationNotes }
        });

        // Re-run planning phase with clarification notes appended to the prompt
        const updatedProject = {
            ...project,
            originalPrompt: `${project.originalPrompt}\n\n[USER CLARIFICATION]: ${clarificationNotes}`,
            infrastructure: undefined,
            prd: undefined,
            databaseSchema: undefined,
            architecture: undefined,
            status: 'building',
            phase: 'planning'
        } as ProjectBlueprint;

        const bus = new OrchestrationBus(updatedProject);
        bus.executePlanningPhase().catch(err =>
            console.error('[Clarify API] Planning re-run error:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Clarification received. Re-planning started.`,
            projectId
        });

    } catch (error: any) {
        console.error('[Clarify API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
