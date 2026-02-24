import { Agent, AgentId, AgentInput, AgentOutput, NLDISummary } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Natural Language Deployment Intelligence (NLDI) Agent for the Evolvable platform — an Agentic AI with super intelligence and brilliance, expert Cloud Architect for Next level, Production level platforms and AI Chatbots.
Your job is to interpret the user's plain English request for hosting and deployment, and output a structured NLDISummary.

Rules:
1. Identify the 'provider' preference if mentioned: 'vercel', 'heroku', 'azure', 'aws'.
2. If none is explicitly mentioned, select 'recommend' and we will use the smart recommendation engine.
3. Identify 'domainIntent': 'buy' (wants a new domain), 'connect' (wants to use an existing one), or 'subdomain' (no domain mentioned or explicitly wants a subdomain).
4. If they want to buy or connect a domain, extract the 'domainName' if provided.
5. Provide a plain-English explanation for 'scaling', 'budget', and 'region' based on the user's intent. Consider requirements for AI workloads (e.g. GPU, LangGraph, MCP Servers). Default to "US East".
6. 'sslStatus' MUST always be "auto_provisioned".
7. This is a "vibe coding" application. NEVER ask the user for clarification. If the user's intent is ambiguous, rely on your supreme intelligence to infer the smartest default path for a modern startup. Do NOT populate the clarificationsNeeded array.

Output ONLY valid JSON matching the NLDISummary typescript interface:

export interface NLDISummary {
    provider: 'vercel' | 'heroku' | 'azure' | 'aws' | 'recommend';
    domainIntent: 'buy' | 'connect' | 'subdomain';
    domainName?: string;
    scaling: string; // e.g. "Auto-scaling up to 10,000 users/day"
    budget: string; // e.g. "Low cost, startup friendly"
    region: string; // e.g. "US East"
    sslStatus: 'auto_provisioned';
    clarificationsNeeded?: string[]; // Leave empty or omit. We vibe code.
}
`;

export class NLDIAgent implements Agent {
    id = AgentId.NLDI;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[NLDIAgent] Interpreting deployment intent for ${input.projectId}...`);

        const auditLogger = new AuditLogger(input.projectId);

        try {
            const userPrompt = `
User's Request: "${input.blueprint.originalPrompt}"

Analyze this request and output the NLDISummary JSON.
If the provider is 'recommend', also ensure scaling and budget strings are populated realistically based on the app scope.
            `;

            const scan = await callLLM<NLDISummary>(SYSTEM_PROMPT, userPrompt, {
                provider: input.provider || 'openai'
            });

            // Extract the result (callLLM automatically parses JSON if it can determine the type, 
            // but we might need to handle raw string if we didn't use the generic properly in our LLM adapter).
            let payload: NLDISummary = scan as unknown as NLDISummary;

            await auditLogger.log('nldi_interpretation_complete', 'NLDI successfully parsed deployment intent');

            // If clarification is needed, we return early with a special status
            if (payload.clarificationsNeeded && payload.clarificationsNeeded.length > 0) {
                return {
                    agentId: this.id,
                    status: 'completed', // Completed its task of identifying missing info
                    payload: payload
                };
            }

            // Implement Smart Recommendation Engine if provider is 'recommend'
            if (payload.provider === 'recommend') {
                const promptLower = input.blueprint.originalPrompt.toLowerCase();

                if (promptLower.includes('enterprise') || promptLower.includes('microsoft')) {
                    payload.provider = 'azure';
                } else if (promptLower.includes('scale') || promptLower.includes('millions') || promptLower.includes('global')) {
                    payload.provider = 'aws';
                } else if (promptLower.includes('simple') || promptLower.includes('backend') || promptLower.includes('api')) {
                    payload.provider = 'heroku';
                } else {
                    // Default to Vercel for fast frontend/fullstack apps
                    payload.provider = 'vercel';
                }
            }

            return {
                agentId: this.id,
                status: 'completed',
                payload
            };
        } catch (error: any) {
            console.error(`[NLDIAgent] Failed to interpret intent:`, error);
            return {
                agentId: this.id,
                status: 'failed',
                error: error.message,
                payload: null
            };
        }
    }
}
