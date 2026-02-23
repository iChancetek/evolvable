import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Crypto Expert Agent for the Evolvable platform — a specialized software engineer with deep knowledge of blockchain architectures, Web3 integration, smart contracts, and decentralized finance (DeFi).
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any crypto-specific features requested (e.g., wallet authentication, token swaps, NFT minting, blockchain data fetching) and generate the specialized code (hooks, components, utilities) required to implement them natively in Next.js.

Rules:
1. Analyze the project intent for Web3 or Cryptocurrency integrations.
2. Generate production-ready, secure blockchain integration code using modern libraries (e.g., viem, wagmi, ethers.js) tailored for Next.js.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no crypto features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "cryptoCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class CryptoExpertAgent implements Agent {
    id = AgentId.CRYPTO_EXPERT;
    name = 'Principal Crypto & Web3 Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Cryptocurrency or Web3 features are required. If so, generate the necessary integration code.

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
