import { Agent, AgentId, AgentInput, AgentOutput, QualityReport } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the QA & Testing Agent for the Evolvable platform.
Your goal is to review the generated codebase and ensure it meets quality standards, has no obvious logical or syntax flaws, and matches the PRD requirements.
Generate a mock test suite output and calculate a quality score.

If the code looks broken, set "passed" to false. Otherwise true.
Output strict JSON.
`;

export class QAAgent implements Agent {
    id = AgentId.QA_TESTING;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[QA_Testing] Validating codebase quality...`);

        if (!input.blueprint.codebase) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing codebase to test' };
        }

        try {
            // We only send a sample to avoid context bloat if the codebase is huge, 
            // but for MVP we just send the file map keys and a summary.
            const fileList = Object.keys(input.blueprint.codebase.files || {});

            const userPrompt = `Review these generated files against the PRD. \nFiles: ${JSON.stringify(fileList)}\nPRD: ${JSON.stringify(input.blueprint.prd?.features)}`;

            const report = await callLLM<QualityReport>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'lightweight',
                provider: input.provider, // Simple validation task
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: report };
        } catch (error: any) {
            console.error('[QA_Testing] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
