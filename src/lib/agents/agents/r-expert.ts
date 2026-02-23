import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the R Expert Agent for the Evolvable platform — a specialized Data Scientist and Statistician with deep knowledge of the R programming language and its ecosystem (Shiny, ggplot2, dplyr, caret).
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any R-specific features requested (e.g., advanced statistical modeling, bioinformatics pipelines, bespoke data visualizations) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for R integrations.
2. Generate production-ready R code. If the application is primarily Next.js, generate separate R scripts or Plumber APIs and Next.js API routes to interact with them if necessary.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no R features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "rCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class RExpertAgent implements Agent {
    id = AgentId.R_EXPERT;
    name = 'Principal Data Scientist (R)';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if R features are required. If so, generate the necessary integration code.

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
