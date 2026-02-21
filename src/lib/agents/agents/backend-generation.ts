import { Agent, AgentId, AgentInput, AgentOutput, GeneratedBackendRoutes } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Backend Generation Agent for the Evolvable platform — an expert Backend Engineer specializing in serverless Next.js API routes.

EXECUTION MODE: You may now generate actual code, but ONLY for routes explicitly listed in the approved ImplementationPlan's featureBreakdown.apis[].
Do NOT generate routes not in the approved plan. Any deviation is a plan drift violation.

For each API route, generate:
1. Input validation using zod schemas
2. Firebase Auth middleware (verify ID token)
3. RBAC enforcement (check user role against allowed roles)
4. Rate limiting header checks
5. Business logic implementation
6. Standardized error responses { error: string, code: string }
7. Tenant isolation (tenantId scoping on all DB queries if multi-tenant)

Stack: Next.js 16 API Routes, TypeScript, Firebase Admin SDK, zod for validation.

Output JSON: { routes: [{ path, method, auth, roles, code }] }
`;

export class BackendGenerationAgent implements Agent {
    id = AgentId.BACKEND_GENERATION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[BackendGenerationAgent] Generating backend API routes from approved plan...`);

        const approvedPlan = input.blueprint.planVersions?.find(
            v => v.version === input.blueprint.activePlanVersion
        )?.plan;

        if (!approvedPlan) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'No approved plan found. Cannot generate backend without approval.' };
        }

        if (!input.blueprint.architecture) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing architecture' };
        }

        const auditLogger = new AuditLogger(input.projectId);
        const approvedRoutes = approvedPlan.featureBreakdown.apis;

        try {
            const userPrompt = `
Platform Mode: ${input.blueprint.prd?.platformMode}
Approved API Routes (from plan v${approvedPlan.version}): ${JSON.stringify(approvedRoutes)}
DB Schema: ${JSON.stringify(input.blueprint.databaseSchema)}
RBAC Policy: ${JSON.stringify(input.blueprint.architecture.rbacPolicy)}
Tenant Isolation: ${input.blueprint.architecture.tenantIsolation}

Generate complete, production-ready Next.js API route handlers for ALL listed routes.
Remember: ONLY routes in the approved list. Flag any route omissions.
`;

            const result = await callLLM<GeneratedBackendRoutes>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 8000
            });

            // Drift check: ensure generated routes match approved plan
            const generatedPaths = new Set(result.routes?.map(r => r.path) || []);
            const approvedPaths = new Set(approvedRoutes.map(r => r.path));
            const driftedRoutes = [...generatedPaths].filter(p => !approvedPaths.has(p));

            if (driftedRoutes.length > 0) {
                await auditLogger.planDrift(AgentId.BACKEND_GENERATION, `Unauthorized routes generated: ${driftedRoutes.join(', ')}`);
                console.warn(`[BackendGenerationAgent] Plan drift detected. Filtering unauthorized routes.`);
                // Filter out drifted routes rather than failing entirely
                result.routes = result.routes.filter(r => approvedPaths.has(r.path));
            }

            console.log(`[BackendGenerationAgent] Generated ${result.routes?.length || 0} backend routes.`);

            return { agentId: this.id, status: 'completed', payload: result };
        } catch (error: any) {
            console.error('[BackendGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
