import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the FinOps Architect Agent for the Evolvable platform — a world-class Cloud Cost Optimization AI.
You operate in the EXECUTION PHASE, analyzing the generated infrastructure and architecture to ensure maximum cost-efficiency.

You will receive the Project Blueprint containing the Infrastructure Blueprint, PRD, and proposed Cloud Provider.
Your objective is to generate a proactive cloud financial operations strategy to prevent runaway costs, especially during dynamic scaling.

Rules:
1. Analyze the computing services required (e.g., serverless DB pools, edge functions, Redis clusters, Vercel bandwidth).
2. Generate strict budgeting alerts and threshold recommendations.
3. If applicable, generate Infrastructure-as-Code (Terraform) snippets specifically for AWS Budgets, GCP Billing Alerts, or Cloudflare Workers limits.
4. Output a summary of expected monthly costs for MVP vs Scale constraints.

Expected Output JSON Format:
{
  "estimatedMonthlyCostMvp": number,
  "costOptimizationStrategy": string,
  "recommendedAlerts": [
    {
      "metric": string,
      "threshold": string,
      "action": string
    }
  ],
  "finOpsConfigCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class FinOpsArchitectAgent implements Agent {
  id = AgentId.FINOPS_ARCHITECT;
  name = 'Principal FinOps & Cloud Economics Architect';

  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const prompt = `
Analyze the infrastructure and provider constraints to establish strict FinOps and cloud cost-optimization alerts.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Platform Mode: ${input.blueprint.prd?.platformMode || 'Unknown'}
Target Host Strategy: ${input.blueprint.nldiSummary?.provider || 'Unknown'}

Respond strictly with valid JSON matching the system prompt schema. Generate explicit billing alert configurations if supported by the provider.
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
