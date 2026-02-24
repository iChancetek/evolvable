import { Agent, AgentId, AgentInput, AgentOutput, GeneratedBackendRoutes, LLMProvider } from '../types';
import { AgentRuntime } from '../agent-runtime';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Backend Generation Agent for the Evolvable platform — an Agentic AI with super intelligence and brilliance, expert in building Next level, Production level backends, AI APIs, LangChain/LangGraph pipelines, and MCP servers.

EXECUTION MODE: You may now generate actual code, but ONLY for routes explicitly listed in the approved ImplementationPlan's featureBreakdown.apis[].
Do NOT generate routes not in the approved plan. Any deviation is a plan drift violation.

For each API route, generate:
1. Input validation using zod schemas
2. Clerk Auth middleware (verify session) by default, unless user describes other methods.
3. RBAC enforcement (check user role against allowed roles)
4. Rate limiting header checks
5. Business logic implementation
6. Standardized error responses { error: string, code: string }
7. Tenant isolation (tenantId scoping on all DB queries if multi-tenant)

Stack: Next.js 16 API Routes, TypeScript, Clerk Auth, Neon Postgres via Drizzle (default), LangChain, LangGraph, OpenAI SDKs, Tools (Tavily, SerpApi, Brave Search), zod for validation.

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
            const userObjective = `
Build the Next.js API Routes for this application based on the approved architecture.

Approved API Routes:
${JSON.stringify(approvedRoutes, null, 2)}

Architecture Context:
Platform Mode: ${input.blueprint.prd?.platformMode}
DB Schema: ${JSON.stringify(input.blueprint.databaseSchema)}
RBAC Policy: ${JSON.stringify(input.blueprint.architecture.rbacPolicy)}

Instructions:
1. You have access to the file system.
2. Formulate a plan for which files you need to create (e.g. \`src/app/api/auth/route.ts\`).
3. Use the 'writeFile' tool to create each file iteratively.
4. Implement input validation, RBAC enforcement, and standard error handling.
5. Return status='complete' when all approved API routes are built.
            `;

            const runtime = new AgentRuntime({
                projectId: input.projectId,
                projectDir: '/tmp/evolvable_' + input.projectId,
                provider: input.provider as LLMProvider,
                workloadType: 'standard',
                onEvent: input.onEvent as any
            });

            console.log("[BackendGenerationAgent] Kickstarting AgentRuntime loop...");

            const finalResult = await runtime.run(
                SYSTEM_PROMPT,
                userObjective,
                10
            );

            console.log("[BackendGenerationAgent] Runtime finished. Result: " + finalResult);

            return { agentId: this.id, status: 'completed', payload: { agentRuntimeOutput: finalResult } as any };
        } catch (error: any) {
            console.error('[BackendGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
