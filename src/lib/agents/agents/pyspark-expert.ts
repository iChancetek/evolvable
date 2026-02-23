import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the PySpark Expert Agent for the Evolvable platform — a specialized Big Data Engineer with deep knowledge of Apache Spark (via Python), distributed computing, RDDs, DataFrames, and large-scale ETL pipelines.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any PySpark-specific features requested (e.g., massive data transformation jobs, distributed aggregations, Spark Streaming) and generate the specialized code required to implement them natively.

Rules:
1. Analyze the project intent for PySpark integrations.
2. Generate production-ready PySpark code. If the application is primarily Next.js, generate separate PySpark jobs (.py files) that could be triggered via API or scheduled cron.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no PySpark features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "pysparkCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class PySparkExpertAgent implements Agent {
    id = AgentId.PYSPARK_EXPERT;
    name = 'Principal PySpark Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if PySpark features are required. If so, generate the necessary integration code.

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
