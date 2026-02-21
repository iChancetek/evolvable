import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';
import { adminDb } from '../../firebase/admin';

const SYSTEM_PROMPT_PLAN = `
You are the Code Generation Architect for the Evolvable platform. 
Given the architectural documents, generate a JSON object containing a SINGLE ARRAY of strings under the key "files".
These strings must be the absolute file paths (e.g. "src/app/page.tsx", "src/lib/db.ts") that need to be generated for this project.
Do NOT generate the code yet. Just the file paths.
`;

const SYSTEM_PROMPT_CODE = `
You are the Code Generation Agent for the Evolvable platform, an elite Full-Stack TypeScript Next.js Engineer.
Your goal is to write the complete, production-ready source code for a specific requested file.

Constraints: Next.js 16 App Router, React 19, Vanilla CSS Modules (no Tailwind), Firebase Auth.
Output ONLY a JSON object with a single key "code" containing the raw code string. Do NOT output markdown backticks around the json.
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

            // Step 1: Map out the necessary files
            console.log(`[CodeGenerationAgent] Generating file manifest...`);
            const planPrompt = `Analyze this architecture and generate the list of files to be built:\n\n${JSON.stringify(context)}`;
            const plan = await callLLM<{ files: string[] }>(SYSTEM_PROMPT_PLAN, planPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true
            });

            if (!plan.files || plan.files.length === 0) {
                throw new Error("Failed to generate a file manifest.");
            }

            console.log(`[CodeGenerationAgent] Planner identified ${plan.files.length} files to build. Beginning stream...`);

            const generatedFiles: Record<string, string> = {};
            const projectRef = adminDb.collection('projects').doc(input.blueprint.id);

            // Step 2: Generate each file sequentially, streaming to Firestore
            for (const filePath of plan.files) {
                console.log(`[CodeGenerationAgent] Generating: ${filePath}`);

                const filePrompt = `Write the complete code for ${filePath}. Architecture Context:\n\n${JSON.stringify({
                    prd: context.prd,
                    db: context.db,
                    arch: context.arch
                })}`;

                try {
                    const result = await callLLM<{ code: string }>(SYSTEM_PROMPT_CODE, filePrompt, {
                        workloadType: 'standard',
                provider: input.provider, // Use standard to keep it fast per file
                        maxTokens: 4000,
                        jsonSchema: true
                    });

                    generatedFiles[filePath] = result.code;

                    // Stream update to Firestore immediately so the UI flashes the new code
                    try {
                        await projectRef.update({
                            'codebase.files': generatedFiles
                        });
                    } catch (e) {
                        console.warn(`[CodeGenerationAgent] Non-fatal error streaming ${filePath} to dashboard:`, e);
                    }

                } catch (fileErr) {
                    console.error(`[CodeGenerationAgent] Failed generating ${filePath}:`, fileErr);
                    // We continue the loop so one bad file doesn't crash the entire generation
                }
            }

            console.log(`[CodeGenerationAgent] Codebase generation stream complete.`);

            const codebase: GeneratedCodebase = {
                files: generatedFiles,
                dependencies: {}
            };

            return { agentId: this.id, status: 'completed', payload: codebase };
        } catch (error: any) {
            console.error('[CodeGenerationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
