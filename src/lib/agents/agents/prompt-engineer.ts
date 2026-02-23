import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Prompt Engineer Expert Agent for the Evolvable platform — a specialized Prompt Engineering professional focused on Chain-of-Thought tuning, prompt optimization, LangChain structured output generation, and LLM metaprogramming.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any requirements for highly optimized system prompts, recursive reasoning chains, or agentic frameworks and generate the corresponding prompt structures and context-window management logic.

Rules:
1. Analyze the project intent for specific Prompt Engineering integrations.
2. Generate production-ready prompt templates and LangChain configuration code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced prompt engineering features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "promptEngineerCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class PromptEngineerAgent implements Agent {
    id = AgentId.PROMPT_ENGINEER;
    name = 'Principal Prompt Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Prompt Engineering features are required. If so, generate the necessary integration code.

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
