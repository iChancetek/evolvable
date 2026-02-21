import {
    Agent, AgentId, AgentInput, AgentOutput,
    ImplementationPlan, PlanVersion
} from '../types';
import { adminDb, FieldValue } from '../../firebase/admin';
import { AuditLogger } from '../../audit/audit-logger';

/**
 * PlanCoordinatorAgent
 *
 * Receives the draft ImplementationPlan from SystemArchitect,
 * persists all versions to Firestore, sets project to 'awaiting_approval',
 * and signals the orchestration bus to pause execution.
 *
 * This agent is the GATE between Planning and Execution phases.
 * No code or infrastructure work happens past this point without approval.
 */
export class PlanCoordinatorAgent implements Agent {
    id = AgentId.PLAN_COORDINATOR;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[PlanCoordinatorAgent] Coordinating plan approval gate...`);

        const systemArchOutput = input.blueprint.architecture;
        const rawPlan: ImplementationPlan | undefined = (input.payload as any)?.implementationPlan;

        if (!rawPlan) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'No ImplementationPlan received from SystemArchitect' };
        }

        try {
            const auditLogger = new AuditLogger(input.projectId);

            // Determine version number
            const existingVersions = input.blueprint.planVersions || [];
            const nextVersion = existingVersions.length + 1;
            rawPlan.version = nextVersion;
            rawPlan.status = 'awaiting_approval';

            const planVersion: PlanVersion = {
                version: nextVersion,
                plan: rawPlan,
                generatedAt: Date.now(),
                agentIds: rawPlan.agentIds
            };

            // Persist to Firestore — project document
            const ref = adminDb.collection('projects').doc(input.projectId);
            await ref.update({
                planVersions: FieldValue.arrayUnion(planVersion),
                activePlanVersion: nextVersion,
                phase: 'awaiting_approval',
                status: 'awaiting_approval',
                platformMode: rawPlan.executiveSummary.appType
            });

            // Audit log — immutable record
            await auditLogger.planGenerated(nextVersion, rawPlan.agentIds);

            console.log(`[PlanCoordinatorAgent] Plan v${nextVersion} persisted. Status: awaiting_approval. Pipeline paused.`);

            return {
                agentId: this.id,
                status: 'completed',
                payload: {
                    planVersion: nextVersion,
                    status: 'awaiting_approval',
                    plan: rawPlan
                }
            };
        } catch (error: any) {
            console.error('[PlanCoordinatorAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
