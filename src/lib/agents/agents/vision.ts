import { Agent, AgentId, AgentInput, AgentOutput, ProductRequirementsDocument, PlatformMode, MonetizationModel } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Vision Agent for the Evolvable platform — an Agentic AI with super intelligence and brilliance, expert Product Strategist and Platform Architect.
Your goal is to build Next level, Production level websites, platforms, AI Chatbots, AI Assistants, and AI Agents by taking a user's raw idea and producing a comprehensive PRD.

CRITICAL — Platform Mode Detection:
Classify the idea into EXACTLY ONE of these platform modes:
- "single_app"           → basic CRUD app, no tenancy needed
- "saas"                 → multi-tenant, subscription-based, org management required
- "marketplace"          → buyer + seller roles, listings, transactions, escrow
- "social"               → user profiles, feeds, follows, real-time activity
- "enterprise_dashboard" → RBAC-heavy, analytics, reporting, admin workflows
- "api_platform"         → developer-facing, API keys, rate limits, webhooks, docs
- "multi_tenant"         → explicit tenant isolation without being full SaaS
- "ai_agent"             → AI Chatbots, AI Assistants, LangChain/LangGraph pipelines, MCP Servers, Tools (Tavily, SerpApi, Brave Search)

For each idea, you must also define:
1. All user roles (e.g., admin, seller, buyer, viewer, tenant_admin)
2. Monetization model (free/freemium/subscription/usage_based/marketplace_fee/none)
3. Feature set — split into MVP, Growth, Scale phases
4. Page inventory with role access control per page
5. Data entities — flag which are tenant-scoped
6. Phased product roadmap

Think like a seasoned CTO + PM. Fill in gaps the user didn't think of.
Return ONLY valid JSON matching the ProductRequirementsDocument schema.
`;

export class VisionAgent implements Agent {
    id = AgentId.VISION;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[VisionAgent] Analyzing idea in PLANNING MODE: "${input.payload}"`);

        // Planning mode guard — this agent is safe (analysis only), but we still flag it
        if (input.planningMode !== true) {
            console.warn('[VisionAgent] Warning: not explicitly in planning mode. Continuing as analysis-only.');
        }

        try {
            const userPrompt = `
Analyze this product idea and generate a complete PRD:
"${input.payload}"

Ensure you:
1. Detect the correct platform mode
2. Define all user roles exhaustively
3. List MVP features a non-technical user wouldn't know they need
4. Flag all multi-tenant data entities
5. Include a 3-phase roadmap
`;

            const prd = await callLLM<ProductRequirementsDocument>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 4096
            });

            console.log(`[VisionAgent] PRD generated. Platform mode: ${prd.platformMode}. Features: ${prd.features?.length || 0}`);

            return {
                agentId: this.id,
                status: 'completed',
                payload: prd
            };
        } catch (error: any) {
            console.error('[VisionAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
