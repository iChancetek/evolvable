import { Agent, AgentId, AgentInput, AgentOutput } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Documentation Agent for the Evolvable platform.
Your goal is to look at all the generated outputs (PRD, Architecture, DB Schema, Workflows) and generate the final User Guide and API Documentation.
It must be non-technical and extremely simple, fitting the "Progressive Disclosure" (Layer 1) design rule.

Output strictly JSON containing the documentation strings.
`;

export class DocumentationAgent implements Agent {
    id = AgentId.DOCUMENTATION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DocumentationAgent] Generating final documentation bundle...`);

        try {
            // Trim down context to save tokens since docs just need the high level
            const context = {
                prd: input.blueprint.prd?.title,
                features: input.blueprint.prd?.features,
                api: input.blueprint.architecture?.apiContracts
            };

            const userPrompt = `Create beginner-friendly documentation for this app:\n${JSON.stringify(context)}`;

            const docs = await callLLM(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'lightweight',
                provider: input.provider, // Perfect for doc gen
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: docs };
        } catch (error: any) {
            console.error('[DocumentationAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
