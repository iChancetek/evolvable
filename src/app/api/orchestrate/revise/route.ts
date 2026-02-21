import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { OrchestrationBus } from '@/lib/agents/orchestration-bus';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * POST /api/orchestrate/revise
 * Requests a revision to the current plan.
 * Resets planning agents and re-runs Planning Phase with revision notes in context.
 *
 * Body: { projectId: string, userId: string, revisionNotes: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, userId, revisionNotes } = await req.json();

        if (!projectId || !userId || !revisionNotes) {
            return NextResponse.json({ error: 'Missing required fields: projectId, userId, revisionNotes' }, { status: 400 });
        }

        const ref = adminDb.collection('projects').doc(projectId);
        const doc = await ref.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const project = doc.data() as ProjectBlueprint;

        if (project.status !== 'awaiting_approval') {
            return NextResponse.json({
                error: `Cannot revise: project status is '${project.status}'. Only plans awaiting approval can be revised.`
            }, { status: 409 });
        }

        // Mark current plan version as revision_requested
        const fromVersion = project.activePlanVersion;
        const updatedPlanVersions = (project.planVersions || []).map(v =>
            v.version === fromVersion
                ? { ...v, plan: { ...v.plan, status: 'revision_requested' }, revisionNotes }
                : v
        );

        // Reset planning outputs so agents regenerate from scratch
        await ref.update({
            planVersions: updatedPlanVersions,
            prd: null,
            databaseSchema: null,
            architecture: null,
            status: 'building',
            phase: 'planning'
        });

        // Audit log
        const auditLogger = new AuditLogger(projectId);
        await auditLogger.planRevisionRequested(fromVersion, revisionNotes, userId);

        // Re-run planning phase with revision notes injected into the prompt
        const updatedProject = {
            ...project,
            planVersions: updatedPlanVersions,
            originalPrompt: `${project.originalPrompt}\n\n[REVISION REQUEST v${fromVersion}]: ${revisionNotes}`,
            prd: undefined,
            databaseSchema: undefined,
            architecture: undefined,
            status: 'building',
            phase: 'planning'
        } as ProjectBlueprint;

        const bus = new OrchestrationBus(updatedProject);
        bus.executePlanningPhase().catch(err =>
            console.error('[Revise API] Planning re-run error:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Plan v${fromVersion} marked for revision. Re-planning started with your notes.`,
            projectId,
            fromVersion,
            nextVersion: fromVersion + 1
        });

    } catch (error: any) {
        console.error('[Revise API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
