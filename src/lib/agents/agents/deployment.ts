import { Agent, AgentId, AgentInput, AgentOutput, DeploymentManifest, MonitoringConfig } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the DevOps & Deployment Agent for the Evolvable platform — a Senior DevOps Engineer.

Generate a complete deployment manifest from the approved plan. Include:
1. Hosting configuration (Firebase App Hosting / Vercel)
2. All required environment variable names (no actual secrets)
3. Domain setup instructions
4. Scaling model (based on platform mode):
   - saas/marketplace/social: auto-scaling, CDN, edge functions
   - enterprise_dashboard: dedicated regions, private networking
   - api_platform: rate-limit-aware scaling, DDoS protection
   - single_app: standard serverless
5. Health check endpoints (at minimum: /api/health)
6. Rollback strategy (blue-green or feature flag based)
7. Monitoring bootstrap configuration

Return JSON with keys "deploymentManifest" and "monitoringConfig".
`;

export class DeploymentAgent implements Agent {
    id = AgentId.DEPLOYMENT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DeploymentAgent] Generating deployment configuration...`);

        // Hard gate: QA must have passed
        if (!input.blueprint.qualityReport?.passed) {
            console.warn('[DeploymentAgent] QA gate not passed — aborting deployment.');
            return { agentId: this.id, status: 'vetoed', payload: null, error: 'Deployment blocked: QA gate failed.' };
        }

        // Hard gate: Security must have passed
        if (!input.blueprint.securityReport?.passed) {
            console.warn('[DeploymentAgent] Security gate not passed — aborting deployment.');
            return { agentId: this.id, status: 'vetoed', payload: null, error: 'Deployment blocked: Security gate failed.' };
        }

        const approvedPlan = input.blueprint.planVersions?.find(
            v => v.version === input.blueprint.activePlanVersion
        )?.plan;

        const auditLogger = new AuditLogger(input.projectId);

        try {
            const userPrompt = `
Platform Mode: ${input.blueprint.prd?.platformMode}
Approved Deployment Strategy: ${JSON.stringify(approvedPlan?.deploymentStrategy)}
Approved Monitoring Plan: ${JSON.stringify(approvedPlan?.monitoringPlan)}
Architecture: ${JSON.stringify(input.blueprint.architecture)}

Generate the complete DeploymentManifest and MonitoringConfig.
Ensure health checks, rollback, and scaling match the approved plan.
`;

            const result = await callLLM<{ deploymentManifest: DeploymentManifest; monitoringConfig: MonitoringConfig }>(
                SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 4000
            }
            );

            await auditLogger.deployed(result.deploymentManifest.liveUrl || 'pending');

            console.log(`[DeploymentAgent] Deployment manifest ready.`);
            return { agentId: this.id, status: 'completed', payload: result };
        } catch (error: any) {
            console.error('[DeploymentAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
