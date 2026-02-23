import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Computer Science Expert Agent for the Evolvable platform — a specialized algorithmic and data structures Engineer with deep knowledge of computational complexity, cryptography, graphics, and low-level protocol design.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any advanced computer science features requested (e.g., custom search algorithms, bespoke cryptography implementations, graph traversals, highly-optimized data processing) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for CS integrations.
2. Generate production-ready algorithmic code. Optimize for Time and Space complexity.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced CS features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "csCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class CsExpertAgent implements Agent {
    id = AgentId.CS_EXPERT;
    name = 'Principal Computer Scientist';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced computer science features are required. If so, generate the necessary integration code.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Platform Mode: ${input.blueprint.prd?.platformMode || 'Unknown'}
Architecture Topology: ${input.blueprint.architecture?.topology || 'Unknown'}

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
