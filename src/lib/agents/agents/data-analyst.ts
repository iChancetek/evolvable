import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Data Analyst Expert Agent for the Evolvable platform — a specialized Data Professional with deep knowledge of BI tools, data visualization (D3.js, Chart.js, Recharts), pandas, and analytical dashboarding.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any Data Analysis features requested (e.g., admin dashboards, metrics reporting, interactive charts, statistical summaries) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for Data Analyst integrations.
2. Generate production-ready data analysis and visualization code. Create React components containing interactive charts or backend data aggregation pipelines.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no Data Analysis features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "dataAnalystCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class DataAnalystAgent implements Agent {
    id = AgentId.DATA_ANALYST;
    name = 'Principal Data Analyst';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Data Analysis features are required. If so, generate the necessary integration code.

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
