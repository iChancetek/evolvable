import { Agent, AgentId, AgentInput, AgentOutput } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Debug & Optimization Agent for the Evolvable platform.
Your goal is to inspect the QA and Security reports, and output any required patches to the codebase to fix defects or improve performance.
If no changes are needed, return an empty patch map.

Output strictly JSON.
`;

export class DebugOptimizeAgent implements Agent {
    id = AgentId.DEBUG_OPTIMIZE;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DebugOptimizeAgent] Reviewing pipeline reports for optimization...`);

        try {
            const context = {
                qa: input.blueprint.qualityReport,
                sec: input.blueprint.securityReport
            };
            const userPrompt = `Analyze these reports and provide code patches if needed:\n${JSON.stringify(context)}`;

            const patches = await callLLM(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: patches };
        } catch (error: any) {
            console.error('[DebugOptimizeAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
