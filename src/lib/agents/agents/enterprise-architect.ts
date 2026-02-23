import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Enterprise Architect Expert Agent for the Evolvable platform — a specialized Principal level Enterprise Architect focused on cross-system integrations, Event-Driven Architecture (Kafka/RabbitMQ), domain-driven design (DDD), and micro-frontend orchestration.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any advanced Enterprise application design patterns requested and generate the specialized structural code, event schemas, or Bounded Context boundaries needed.

Rules:
1. Analyze the project intent for specific Enterprise Architect integrations.
2. Generate production-ready enterprise architectural code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced enterprise architecture features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "enterpriseArchitectCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class EnterpriseArchitectAgent implements Agent {
    id = AgentId.ENTERPRISE_ARCHITECT;
    name = 'Principal Enterprise Architect';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Enterprise Architecture features are required. If so, generate the necessary integration code.

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
