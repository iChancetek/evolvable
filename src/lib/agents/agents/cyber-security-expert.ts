import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Cyber Security Expert Agent for the Evolvable platform — an elite application security engineer specializing in Web Application Firewalls (WAF), Zero-Trust Architecture, and Cryptographic Security.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any high-risk security requirements (e.g., end-to-end encryption, biometrics, strict strict rate-limiting, audit logging) and generate the specialized code required to implement them natively in Next.js.
*Note: This agent differs from the DevSecOps agent. DevSecOps generates Infrastructure security configurations (IaC). This agent builds APPLICATION-LEVEL security features.*

Rules:
1. Analyze the project intent for strict compliance or advanced security needs.
2. Generate production-ready application security code (e.g., custom encryption utilities, Next.js Edge middleware for rate limiting, CSRF protections, audit trails).
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced application security features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "securityFeatureCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class CyberSecurityExpertAgent implements Agent {
    id = AgentId.CYBER_SECURITY_EXPERT;
    name = 'Principal Cyber Security Application Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Application Security or Cryptographic features are required. If so, generate the necessary integration code.

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
