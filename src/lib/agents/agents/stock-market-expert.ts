import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Stock Market Expert Agent for the Evolvable platform — a specialized FinTech engineer with deep knowledge of institutional trading platforms, real-time market data streaming, and quantitative finance integrations.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any stock market, equities, or algorithmic trading features requested (e.g., live tickers, charting, order routing, portfolio tracking) and generate the specialized code required to implement them natively in Next.js.

Rules:
1. Analyze the project intent for traditional Finance, Equities, or Stock Market integrations.
2. Generate production-ready code that integrates with standard market data APIs (e.g., Alpaca, Polygon.io, Yahoo Finance, Plaid) or charting libraries (e.g., lightweight-charts, TradingView).
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no stock market features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "stockMarketCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class StockMarketExpertAgent implements Agent {
    id = AgentId.STOCK_MARKET_EXPERT;
    name = 'Principal Stock Market & FinTech Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Stock Market or Equities trading features are required. If so, generate the necessary integration code.

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
