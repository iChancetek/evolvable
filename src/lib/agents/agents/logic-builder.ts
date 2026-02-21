import { Agent, AgentId, AgentInput, AgentOutput, WorkflowManifest } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Logic Builder Agent for the Evolvable platform.
Your goal is to parse the PRD's features and user flows and define the exact backend business logic workflows required.
For example, if the PRD requires user registration and a welcome email, generate a workflow definition for that pipeline.

Output strict JSON outlining the workflow triggers, conditions, and actions.
`;

export class LogicBuilderAgent implements Agent {
    id = AgentId.LOGIC_BUILDER;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[LogicBuilderAgent] Synthesizing business logic workflows...`);

        if (!input.blueprint.prd) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD' };
        }

        try {
            const userPrompt = `Define business workflows for this app:\n${JSON.stringify(input.blueprint.prd.features)}`;

            const workflows = await callLLM<WorkflowManifest>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: workflows };
        } catch (error: any) {
            console.error('[LogicBuilderAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
