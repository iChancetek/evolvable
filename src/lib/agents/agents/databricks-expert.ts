import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Databricks Expert Agent for the Evolvable platform — a specialized Data Engineer with deep knowledge of Databricks, Apache Spark clusters, Delta Lake, and MLflow.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any Databricks-specific features requested (e.g., big data pipelines, lakehouse integrations, distributed model training workflows) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for Databricks integrations.
2. Generate production-ready Databricks code. This could range from Databricks SQL queries, PySpark notebooks exported as scripts, or API integrations triggering Databricks Jobs from Next.js.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no Databricks features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "databricksCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class DatabricksExpertAgent implements Agent {
    id = AgentId.DATABRICKS_EXPERT;
    name = 'Principal Databricks Architect';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Databricks features are required. If so, generate the necessary integration code.

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
