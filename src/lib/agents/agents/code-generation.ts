import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase, LLMProvider } from '../types';
import { callLLM } from '../llm-adapter';
import { AgentRuntime } from '../agent-runtime';
import { adminDb } from '../../firebase/admin';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT_PLAN = `
You are the Frontend Code Planner for the Evolvable platform.
Given the approved implementation plan and architecture, generate a JSON object with key "files" containing an array of file paths to generate.
The file list MUST exactly match the pages listed in the approved plan's featureBreakdown.pages[]. Do not add unlisted pages.
Include all supporting files: CSS modules, lib utilities, hooks, components.
`;

const SYSTEM_PROMPT_CODE = `
You are the Frontend Code Generation Agent for the Evolvable platform — an Agentic AI with super intelligence and brilliance, expert in building Next level, Production level applications, AI Chatbots, and platforms.
Generate complete, production-ready source code for the requested file.

Rules:
- Next.js 16 App Router, React 19, Tailwind CSS, Shadcn UI components, Clerk Auth (Unless the user explicitly described other methods)
- Apply role-based UI rendering: hide/show sections based on user role from auth context
- Wire all data fetching to the approved API route contracts
- For SaaS/multi-tenant: include tenant context and org switcher if applicable
- For marketplace: include seller/buyer-specific views
- For social: include real-time subscription hooks
- Output ONLY a JSON object with key "code" containing the raw file content string
`;

export class CodeGenerationAgent implements Agent {
    id = AgentId.CODE_GENERATION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[CodeGenerationAgent] Generating frontend from approved plan...`);

        if (!input.blueprint.architecture || !input.blueprint.databaseSchema) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing upstream dependencies' };
        }

        // Retrieve approved plan for plan-derived file manifest
        const approvedPlan = input.blueprint.planVersions?.find(
            v => v.version === input.blueprint.activePlanVersion
        )?.plan;

        if (!approvedPlan) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'No approved plan found. Cannot generate code.' };
        }

        const auditLogger = new AuditLogger(input.projectId);

        try {
            const context = {
                prd: input.blueprint.prd,
                design: input.blueprint.designSystem,
                db: input.blueprint.databaseSchema,
                arch: input.blueprint.architecture,
                approvedPages: approvedPlan.featureBreakdown.pages,
                apiContracts: input.blueprint.architecture.apiContracts,
                rbacPolicy: input.blueprint.architecture.rbacPolicy
            };

            const userObjective = `
Build the Next.js frontend for this application based on the approved architecture.

Approved Pages to Build:
${JSON.stringify(context.approvedPages, null, 2)}

Architecture Context:
Platform Mode: ${context.prd?.platformMode}
DB Schema: ${JSON.stringify(context.db)}
API Contracts: ${JSON.stringify(context.apiContracts)}
RBAC Policy: ${JSON.stringify(context.rbacPolicy)}

Instructions:
1. You have access to the file system.
2. Formulate a plan for which files you need to create (\`page.tsx\`, \`layout.tsx\`, components).
3. Use the 'writeFile' tool to create each file iteratively.
4. Ensure you use Tailwind CSS and shadcn/ui.
5. If creating a dashboard or SAAS, implement proper layout sidebars and navigation.
6. Return status='complete' when all approved pages are built.
            `;

            const runtime = new AgentRuntime({
                projectId: input.projectId,
                projectDir: '/tmp/evolvable_' + input.projectId, // Workspace directory
                provider: input.provider as LLMProvider,
                workloadType: 'standard',
                onEvent: input.onEvent as any
            });

            console.log("[CodeGenerationAgent] Kickstarting AgentRuntime loop...");

            const finalResult = await runtime.run(
                SYSTEM_PROMPT_CODE,
                userObjective,
                15 // Max iterations limit for safety
            );
            console.log("[CodeGenerationAgent] Runtime finished. Result: " + finalResult);

            return {
                agentId: this.id,
                status: 'completed',
                payload: { agentRuntimeOutput: finalResult }
            };
        } catch (error: any) {
            console.error('[CodeGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
