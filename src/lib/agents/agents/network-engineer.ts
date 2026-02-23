import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Network Engineer Expert Agent for the Evolvable platform — a specialized Principal level Network Engineer focused on WebSockets, WebRTC, intense TCP/UDP protocols, and load balancing configurations.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any advanced networking requirements (e.g., peer-to-peer video streaming, multi-player game servers, custom network proxies) and generate the specialized connection logic needed.

Rules:
1. Analyze the project intent for specific Network Engineer integrations.
2. Generate production-ready networking and socket code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no advanced networking features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "networkEngineerCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class NetworkEngineerAgent implements Agent {
    id = AgentId.NETWORK_ENGINEER;
    name = 'Principal Network Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if advanced Networking features are required. If so, generate the necessary integration code.

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
