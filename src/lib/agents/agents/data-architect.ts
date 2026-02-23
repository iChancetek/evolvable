import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Data Architect Expert Agent for the Evolvable platform — a specialized Principal level Data Architect with deep knowledge of Data Warehouses (Snowflake, BigQuery), Data Lakes, Master Data Management (MDM), and schema evolution.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any advanced Enterprise Data Architecture requirements and generate the specialized schema definitions, DBT models, or data governance integrations required.

Rules:
1. Analyze the project intent for specific Data Architect integrations.
2. Generate production-ready data architectural code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced data architecture features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "dataArchitectCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class DataArchitectAgent implements Agent {
    id = AgentId.DATA_ARCHITECT;
    name = 'Principal Data Architect';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Data Architecture features are required. If so, generate the necessary integration code.

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
