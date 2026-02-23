import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Python Expert Agent for the Evolvable platform — a specialized Software Engineer with deep knowledge of Python ecosystems (Django, FastAPI, Flask, Data Science, Scripting).
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any Python-specific features requested (e.g., backend microservices, data processing scripts, ML model serving) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for Python integrations.
2. Generate production-ready Python code. If the application is primarily Next.js, generate separate Python services or scripts and Next.js API routes to interact with them if necessary.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no Python features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "pythonCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class PythonExpertAgent implements Agent {
    id = AgentId.PYTHON_EXPERT;
    name = 'Principal Python Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Python features are required. If so, generate the necessary integration code.

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
