import {
    Agent, AgentId, AgentInput, AgentOutput,
    ArchitectureDesignDocument, ImplementationPlan, RBACPolicy, TenantIsolationStrategy
} from '../types';
import { callLLM } from '../llm-adapter';

const ARCH_PROMPT = `
You are the System Architect Agent for the Evolvable platform — a Principal Software Engineer and Cloud Architect.
You operate in PLANNING MODE only. Do NOT generate actual code.

Given the PRD and DB Schema, design the complete system architecture and generate a full ImplementationPlan.

Platform Stack (fixed):
- Frontend: Next.js 16 (App Router), React 19, CSS Modules
- Backend: Next.js API Routes (Serverless Functions)
- Database: As determined by DB Architect (Firestore/PostgreSQL/MongoDB)
- Auth: Firebase Authentication
- Hosting: Firebase App Hosting / Vercel

For each platform mode, apply appropriate patterns:
- saas: multi-tenant org isolation, subscription billing hooks, org-switcher UI
- marketplace: separate buyer/seller flows, transaction ledger, escrow logic
- social: real-time subscriptions, activity feeds, follow graphs
- enterprise_dashboard: complex RBAC, audit trails, data export, heavy analytics
- api_platform: API key management, rate limiting, webhook delivery, developer portal
- multi_tenant: strict row-level or schema-level tenant isolation

Output a JSON object with TWO keys:
1. "architecture" — ArchitectureDesignDocument
2. "implementationPlan" — Full 9-section ImplementationPlan

Self-validation rules (all must be true before returning):
- architectureCrossReviewed: verify frontend + backend + DB are coherent
- scalabilityValidated: confirm schema supports growth to 100k users
- securityValidated: all routes have auth strategy, no open endpoints
- multiTenantIntegrityChecked: if platformMode requires isolation, confirm it's enforced
- feasibilityConfirmed: implementation is achievable on the defined stack

Return ONLY valid JSON.
`;

export class SystemArchitectAgent implements Agent {
    id = AgentId.SYSTEM_ARCHITECT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[SystemArchitectAgent] Designing architecture in PLANNING MODE...`);

        if (!input.blueprint.prd || !input.blueprint.databaseSchema) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD or DB Schema' };
        }

        try {
            const userPrompt = `
Platform Mode: ${input.blueprint.prd.platformMode}
User Roles: ${JSON.stringify(input.blueprint.prd.userRoles)}
PRD: ${JSON.stringify(input.blueprint.prd)}
DB Schema: ${JSON.stringify(input.blueprint.databaseSchema)}

Generate the complete ArchitectureDesignDocument AND the full 9-section ImplementationPlan.
Ensure ALL selfValidation flags are true before returning — reject and retry if any is false.
`;

            const result = await callLLM<{
                architecture: ArchitectureDesignDocument;
                implementationPlan: ImplementationPlan;
            }>(ARCH_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 8000
            });

            // Enforce self-validation — hard fail if any check is false
            const sv = result.implementationPlan?.selfValidation;
            if (!sv?.architectureCrossReviewed || !sv?.scalabilityValidated ||
                !sv?.securityValidated || !sv?.feasibilityConfirmed) {
                throw new Error(`[SystemArchitectAgent] Self-validation failed: ${JSON.stringify(sv)}`);
            }

            // Stamp metadata
            result.implementationPlan.version = 1;
            result.implementationPlan.generatedAt = Date.now();
            result.implementationPlan.agentIds = [AgentId.VISION, AgentId.DB_ARCHITECT, AgentId.SYSTEM_ARCHITECT];
            result.implementationPlan.status = 'draft';

            console.log(`[SystemArchitectAgent] Plan generated. Mode: ${result.architecture.platformMode}. Self-validation: PASSED`);

            return {
                agentId: this.id,
                status: 'completed',
                payload: result
            };
        } catch (error: any) {
            console.error('[SystemArchitectAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
