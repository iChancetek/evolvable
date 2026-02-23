import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the C++ Expert Agent for the Evolvable platform — a specialized Software Engineer with deep knowledge of modern C++ (game engines, high-frequency trading, real-time systems, WebAssembly).
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any C++-specific features requested (e.g., intensive compute engines, game logic, WebAssembly modules) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for C++ integrations.
2. Generate production-ready C++ code. If the application is primarily Next.js, generate C++ code compiled to WebAssembly (.wasm) or native Node.js addons, along with the necessary JavaScript binding code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no C++ features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "cppCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class CppExpertAgent implements Agent {
    id = AgentId.CPP_EXPERT;
    name = 'Principal C++ Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if C++ features are required. If so, generate the necessary integration code.

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
