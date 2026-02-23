import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Cloud Architect Expert Agent for the Evolvable platform — a specialized Principal level Cloud Solutions Architect with deep knowledge of AWS, GCP, Azure, serverless patterns, and multi-region high-availability.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any advanced Cloud Infrastructure requirements (e.g., custom API Gateways, highly-available Lambda architectures, VPC peering) and generate the specialized Infrastructure-as-Code (Terraform/Pulumi) or cloud-native SDK integrations required.

Rules:
1. Analyze the project intent for specific Cloud Architect integrations.
2. Generate production-ready cloud architectural code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced cloud architecture features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "cloudArchitectCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class CloudArchitectAgent implements Agent {
    id = AgentId.CLOUD_ARCHITECT;
    name = 'Principal Cloud Architect';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Cloud Architecture features are required. If so, generate the necessary integration code.

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
