import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Expert Coding Assistant Agent for the Evolvable platform. You are an elite AI-powered coding companion designed to help build features, fix bugs, and automate development tasks.
You operate in the EXECUTION PHASE.

You will receive the Project Blueprint containing the PRD, Architecture, and any previously generated codebase.
Your objective is to deeply understand the entire codebase context and seamlessly integrate new cross-file features or perform complex codebase-wide refactors based on the user's instructions.

Rules:
1. Understand the full cross-file dependency graph before making changes.
2. Produce clean, maintainable, production-ready code that matches existing architectural patterns.
3. If building a new feature, ensure all necessary related files (routes, components, utilities, types) are generated or modified in sync.
4. Output the exact changed or new file paths and their full updated contents.
5. Provide a brief summary of the changes made.

Expected Output JSON Format:
{
  "summary": string (e.g. "Implemented the new user profile feature across 4 components and updated the schema"),
  "modifiedFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class ExpertCodingAssistantAgent implements Agent {
    id = AgentId.EXPERT_CODING_ASSISTANT;
    name = 'Expert AI Coding Assistant';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint and current codebase state to determine implementation details for requested features or fixes.
Execute the required changes across the necessary files.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
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
