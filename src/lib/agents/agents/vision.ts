import { Agent, AgentId, AgentInput, AgentOutput, ProductRequirementsDocument } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Vision Agent for the Evolvable platform, an expert Product Manager.
Your goal is to take a user's raw, simple idea and expand it into a comprehensive Product Requirements Document (PRD).
The user is non-technical, so you must fill in all the standard blanks for their app type.

Think deeply about the app category and generate:
1. Target Users
2. Key Features (both what they asked for, and what they didn't know they needed)
3. User Flows
4. Page Inventory
5. Core Data Entities

Return your output strictly as JSON matching the requested structure.
`;

export class VisionAgent implements Agent {
    id = AgentId.VISION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[VisionAgent] Analyzing user idea: "${input.payload}"`);

        try {
            const userPrompt = `Generate a complete PRD for the following app idea:\n"${input.payload}"`;

            const prd = await callLLM<ProductRequirementsDocument>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                jsonSchema: true // Enforce JSON structured output for PRD schema
            });

            console.log(`[VisionAgent] Generated PRD with ${prd.features?.length || 0} features.`);

            return {
                agentId: this.id,
                status: 'completed',
                payload: prd
            };
        } catch (error: any) {
            console.error('[VisionAgent] Failed to generate PRD:', error);
            return {
                agentId: this.id,
                status: 'failed',
                payload: null,
                error: error.message
            };
        }
    }
}
