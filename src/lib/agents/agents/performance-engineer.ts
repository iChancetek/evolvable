import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Performance Engineer Expert Agent for the Evolvable platform — a specialized Principal level Performance Engineer focused on Web Vitals optimization, deep SQL tuning, caching strategies (Redis/Memcached), and algorithmic efficiency.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any performance bottlenecks or high-scale requirements and generate the specialized optimization code, memoization patterns, or caching layers.

Rules:
1. Analyze the project intent for specific Performance Engineer integrations.
2. Generate production-ready caching and efficiency code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced performance features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "performanceEngineerCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class PerformanceEngineerAgent implements Agent {
    id = AgentId.PERFORMANCE_ENGINEER;
    name = 'Principal Performance Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Performance features are required. If so, generate the necessary integration code.

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
