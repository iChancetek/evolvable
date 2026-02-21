import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AuditLogger } from '@/lib/audit/audit-logger';
import { OrchestrationBus } from '@/lib/agents/orchestration-bus';
import { ProjectBlueprint } from '@/lib/agents/types';

/**
 * POST /api/orchestrate/approve
 * Explicitly approves a plan version and resumes the execution pipeline.
 *
 * Body: { projectId: string, userId: string, planVersion: number }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, userId, planVersion } = await req.json();

        if (!projectId || !userId || !planVersion) {
            return NextResponse.json({ error: 'Missing required fields: projectId, userId, planVersion' }, { status: 400 });
        }

        // Fetch project from Firestore
        const ref = adminDb.collection('projects').doc(projectId);
        const doc = await ref.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const project = doc.data() as ProjectBlueprint;

        // Validate state
        if (project.status !== 'awaiting_approval') {
            return NextResponse.json({
                error: `Cannot approve: project status is '${project.status}'. Expected 'awaiting_approval'.`
            }, { status: 409 });
        }

        if (project.activePlanVersion !== planVersion) {
            return NextResponse.json({
                error: `Plan version mismatch: active is v${project.activePlanVersion}, tried to approve v${planVersion}`
            }, { status: 409 });
        }

        // Update the plan version to approved
        const now = Date.now();
        const updatedPlanVersions = (project.planVersions || []).map(v =>
            v.version === planVersion
                ? { ...v, plan: { ...v.plan, status: 'approved' }, approvedAt: now, approvedByUserId: userId }
                : v
        );

        await ref.update({
            planVersions: updatedPlanVersions,
            status: 'building',
            phase: 'executing'
        });

        // Audit log the approval
        const auditLogger = new AuditLogger(projectId);
        await auditLogger.planApproved(planVersion, userId);

        // Resume execution pipeline (async — do not await in request)
        const updatedProject = { ...project, planVersions: updatedPlanVersions, status: 'building', phase: 'executing' } as ProjectBlueprint;
        const bus = new OrchestrationBus(updatedProject);

        // Fire and forget — pipeline runs in background
        bus.executeAfterApproval(userId).catch(err =>
            console.error('[Approve API] Execution pipeline error:', err)
        );

        return NextResponse.json({
            success: true,
            message: `Plan v${planVersion} approved. Execution pipeline started.`,
            projectId,
            planVersion
        });

    } catch (error: any) {
        console.error('[Approve API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
