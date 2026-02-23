import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';
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
                logic: input.blueprint.workflows,
                platformMode: input.blueprint.prd?.platformMode,
                approvedPages: approvedPlan.featureBreakdown.pages,
                apiContracts: input.blueprint.architecture.apiContracts,
                rbacPolicy: input.blueprint.architecture.rbacPolicy
            };

            // Step 1: Generate file manifest derived from approved plan (not LLM hallucination)
            console.log(`[CodeGenerationAgent] Generating plan-derived file manifest...`);
            const planPrompt = `
Approved pages from plan: ${JSON.stringify(approvedPlan.featureBreakdown.pages)}
Platform mode: ${context.platformMode}
Architecture: ${JSON.stringify(context.arch)}
Generate the complete list of files to build (pages + components + utilities). Stay within the approved scope.
`;
            const plan = await callLLM<{ files: string[] }>(SYSTEM_PROMPT_PLAN, planPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true
            });

            if (!plan.files || plan.files.length === 0) throw new Error('Failed to generate file manifest.');
            console.log(`[CodeGenerationAgent] Planning ${plan.files.length} files.`);

            const generatedFiles: Record<string, string> = {};
            const projectRef = adminDb.collection('projects').doc(input.blueprint.id);

            // Step 2: Generate files in parallel batches of 4
            const BATCH_SIZE = 4;
            for (let i = 0; i < plan.files.length; i += BATCH_SIZE) {
                const batch = plan.files.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (filePath) => {
                    console.log(`[CodeGenerationAgent] Generating: ${filePath}`);
                    const filePrompt = `
File to generate: ${filePath}
Platform Mode: ${context.platformMode}
API Contracts (approved): ${JSON.stringify(context.apiContracts?.slice(0, 5))}
RBAC Policy: ${JSON.stringify(context.rbacPolicy)}
DB Schema: ${JSON.stringify(context.db)}
Architecture: ${JSON.stringify(context.arch)}
PRD: ${JSON.stringify(context.prd)}
`;
                    try {
                        const result = await callLLM<{ code: string }>(SYSTEM_PROMPT_CODE, filePrompt, {
                            workloadType: 'standard',
                            provider: input.provider,
                            maxTokens: 4000,
                            jsonSchema: true
                        });
                        generatedFiles[filePath] = result.code;
                        // Stream progress to Firestore
                        await projectRef.update({ 'codebase.files': generatedFiles }).catch(() => { });
                    } catch (fileErr) {
                        console.error(`[CodeGenerationAgent] Failed generating ${filePath}:`, fileErr);
                    }
                }));
            }

            console.log(`[CodeGenerationAgent] Frontend generation complete. ${Object.keys(generatedFiles).length} files written.`);

            return {
                agentId: this.id,
                status: 'completed',
                payload: { files: generatedFiles, dependencies: {} } as GeneratedCodebase
            };
        } catch (error: any) {
            console.error('[CodeGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
