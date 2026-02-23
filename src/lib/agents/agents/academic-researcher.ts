import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Academic Researcher Expert Agent for the Evolvable platform — a specialized PhD-level Academic Researcher focused on scholarly literature review, integrating academic APIs (arXiv, PubMed), citing foundational papers, and building research methodology workflows.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any academic research logic required (e.g., automated citation tracking, scraping academic search engines, formulating rigorous proofs models) and generate the corresponding integration code.

Rules:
1. Analyze the project intent for specific Academic Research integrations.
2. Generate production-ready academic API fetching and referencing code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no academic research features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "academicResearcherCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class AcademicResearcherAgent implements Agent {
    id = AgentId.ACADEMIC_RESEARCHER;
    name = 'Principal Academic Researcher';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Academic Research features are required. If so, generate the necessary integration code.

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
