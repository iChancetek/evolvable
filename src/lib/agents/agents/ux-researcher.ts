import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the UX Researcher Agent for the Evolvable platform — a world-class Product Designer inspired by the intelligence of platforms like Lovable.
You operate in the PLANNING PHASE, running directly before the UI Designer.

You will receive the Project Blueprint containing the PRD.
Your objective is to generate a comprehensive UX Research Report that dictates how the final interface should be structured.

Analyze the PRD and output a JSON object containing:
1. targetDemographic: Detailed description of the primary user base and their technical proficiency.
2. accessibilityRequirements: Array of strict wcag criteria (e.g., "high contrast mode required", "screen reader optimized flows").
3. coreUserJourneys: Array of the top 3-5 critical paths a user will take, optimized for frictionless conversion.
4. designVibe: A descriptive paragraph defining the aesthetic tone (e.g., "Minimalist, corporate, trustworthy" vs "Playful, neon, high-energy").

Expected Output JSON Format:
{
  "targetDemographic": string,
  "accessibilityRequirements": string[],
  "coreUserJourneys": [
    {
      "persona": string,
      "goal": string,
      "steps": string[]
    }
  ],
  "designVibe": string
}
`;

export class UXResearcherAgent implements Agent {
    id = AgentId.UX_RESEARCHER;
    name = 'UX Researcher & Product Strategist';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the following Product Requirements Document and generate the UX Research Report.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Platform Mode: ${input.blueprint.prd?.platformMode || 'Unknown'}
Target Users: ${input.blueprint.prd?.targetUsers?.join(', ') || 'Unknown'}

Respond strictly with valid JSON matching the system prompt schema.
`;

            const parsedPayload = await callLLM<any>(SYSTEM_PROMPT, prompt, {
                provider: input.provider,
                jsonSchema: true
            });

            return {
                agentId: this.id,
                status: 'completed',
                payload: parsedPayload,
            };

        } catch (error: any) {
            return {
                agentId: this.id,
                status: 'failed',
                error: error.message,
                payload: null
            };
        }
    }
}
