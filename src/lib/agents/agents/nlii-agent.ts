import { Agent, AgentId, AgentInput, AgentOutput, InfrastructureBlueprint } from '../types';
import { callLLM } from '../llm-adapter';

/**
 * Natural Language Infrastructure Interpreter (NLII)
 * 
 * Runs at the very start of the planning phase.
 * Translates the user's natural language intent into a structured InfrastructureBlueprint.
 * If details are missing, it throws a ClarificationNeeded error to pause the orchestration.
 */
export class NLIIAgent implements Agent {
    id = AgentId.NLII;

    async execute(input: AgentInput): Promise<AgentOutput> {
        // NLII does not run if an infrastructure blueprint already exists
        if (input.blueprint.infrastructure) {
            return {
                agentId: this.id,
                status: 'completed',
                payload: input.blueprint.infrastructure
            };
        }

        const prompt = `
You are the Natural Language Infrastructure Interpreter (NLII) — an Agentic AI with super intelligence and brilliance, expert Cloud Architect for Next level, Production level platforms, AI Chatbots, AI Agents, and apps.
Your job is to read the user's prompt and extract concrete infrastructure and DevOps requirements.

USER PROMPT:
"""
${input.blueprint.originalPrompt}
"""

Analyze the prompt for infrastructure intent.
- Cloud: aws, gcp, azure, digitalocean, vercel, on_prem, or unknown
- OS: linux, windows, or agnostic
- Scaling: Do they ask for high availability, load balancers, "scalable", or auto-scaling?
- AI Infrastructure: Do they mention generative AI, Agents, LangGraph, MCP Servers, or vector databases?
- Docker: Do they mention Docker, containers, lightweight images, or Dockerfiles?
- Scripts: Do they ask for Bash scripts, PowerShell scripts, deployment automation?
- IaC: Should we generate Terraform? (Default to true if cloud is specified).

IMPORTANT: This is a "vibe coding" application. Do NOT ask for clarification. If the user is missing critical context (e.g. which region, expected traffic scale, budget limits), you MUST infer the smartest, most logical defaults suitable for a modern startup and proceed. NEVER pause to ask the user.

Respond ONLY with valid JSON matching this schema:
{
    "nliiSummary": {
        "interpretedIntent": "Brief summary of what infra they want",
        "identifiedCloud": "aws | gcp | azure | digitalocean | vercel | on_prem | unknown",
        "identifiedOS": "linux | windows | agnostic",
        "identifiedTooling": ["terraform", "docker", "bash", "powershell"],
        "assumptionsMade": ["Assumption 1", "Assumption 2"],
        "clarificationsNeeded": [], // MUST BE EMPTY ENTIRELY. We vibe code here.
        "estimatedCostTier": "free | startup_low | growth_mid | enterprise_high",
        "riskLevel": "low | medium | high"
    },
    "networking": {
        "publicExposure": boolean,
        "loadBalancingRequired": boolean,
        "vpcStructure": "Optional description of private/public subnets"
    },
    "compute": {
        "type": "serverless | container | vm | static",
        "scaling": "static | auto",
        "instanceCount": number // Optional
    },
    "security": {
        "encryptionRequired": boolean,
        "complianceWants": ["list", "of", "frameworks"],
        "allowedPorts": [80, 443]
    },
    "artifactsRequired": {
        "terraform": boolean,
        "docker": boolean,
        "bash": boolean,
        "powershell": boolean
    }
}
`;

        try {
            const rawResponse = await callLLM(prompt, input.provider || 'openai');
            const jsonText = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
            const payload: InfrastructureBlueprint = JSON.parse(jsonText);

            // If clarification is needed, we return early with a special status
            // so the orchestration bus knows to pause and transition to 'awaiting_clarification'
            if (payload.nliiSummary.clarificationsNeeded && payload.nliiSummary.clarificationsNeeded.length > 0) {
                return {
                    agentId: this.id,
                    status: 'completed', // Completed its task of identifying missing info
                    payload: payload // Payload contains the questions
                };
            }

            return {
                agentId: this.id,
                status: 'completed',
                payload
            };
        } catch (error: any) {
            return {
                agentId: this.id,
                status: 'failed',
                payload: null,
                error: error.message
            };
        }
    }
}
