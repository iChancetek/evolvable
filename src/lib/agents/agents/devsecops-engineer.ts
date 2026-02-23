import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the DevSecOps Engineer Agent for the Evolvable platform — an elite Infrastructure Security & Compliance AI.
You operate in the EXECUTION PHASE, parallel with the DevOps and Infrastructure agents.

You will receive the Project Blueprint containing the Architecture, Infrastructure Blueprint, and GeneratedCodebase.
Your objective is to generate strict security policies, IaC scanning configurations, and compliance rules (e.g. SOC2, HIPAA, GDPR).

Rules:
1. Analyze the infrastructure and application topology for attack vectors.
2. Generate security-specific configurations (e.g., \`.snyk\`, \`checkov.yml\`, or specific GitHub Action steps for SAST/DAST).
3. Provide a DevSecOps Audit Report detailing hardened boundaries (e.g., WAF rules, RLS policies, network isolation).

Expected Output JSON Format:
{
  "complianceScope": string[],
  "auditReport": string,
  "securityConfigCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class DevSecOpsEngineerAgent implements Agent {
    id = AgentId.DEVSECOPS_ENGINEER;
    name = 'Principal DevSecOps & Compliance Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the architecture and infrastructure to generate DevSecOps configurations.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Architecture Topology: ${input.blueprint.architecture?.topology || 'Unknown'}
Target Host Strategy: ${input.blueprint.nldiSummary?.provider || 'Unknown'}

Respond strictly with valid JSON matching the system prompt schema. Provide full file contents for generated security configs.
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
