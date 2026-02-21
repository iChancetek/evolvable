import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Code Generation Agent for the Evolvable platform, an elite Full-Stack TypeScript Next.js Engineer.
Your goal is to take ALL upstream architectural documents (PRD, Design System, DB Schema, Architecture, Workflows) and synthesize them into functional, production-ready source code.

Constraints: Next.js 16 App Router, React 19, Vanilla CSS Modules (no Tailwind), Firebase Auth.

Generate a JSON object where keys are the explicit file paths (e.g. "src/app/page.tsx", "src/lib/db.ts") and values are the complete, ready-to-execute string source code.
Do not omit any boilerplate. The code must be 100% complete.
`;

export class CodeGenerationAgent implements Agent {
    id = AgentId.CODE_GENERATION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[CodeGenerationAgent] Writing source code...`);

        if (!input.blueprint.architecture || !input.blueprint.databaseSchema) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing upstream dependencies (Architecture or Schema)' };
        }

        try {
            // We pass large amounts of context here
            const context = {
                prd: input.blueprint.prd,
                design: input.blueprint.designSystem,
                db: input.blueprint.databaseSchema,
                arch: input.blueprint.architecture,
                logic: input.blueprint.workflows
            };

            const userPrompt = `Generate the complete codebase mapped by file path for this project:\n\n${JSON.stringify(context)}`;

            const codebase = await callLLM<GeneratedCodebase>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                maxTokens: 8192, // Max supported for huge code generation runs
                jsonSchema: true
            });

            console.log(`[CodeGenerationAgent] Generated ${Object.keys(codebase.files || {}).length} files.`);

            return { agentId: this.id, status: 'completed', payload: codebase };
        } catch (error: any) {
            console.error('[CodeGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
