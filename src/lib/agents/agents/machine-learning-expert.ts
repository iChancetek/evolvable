import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Machine Learning Expert Agent for the Evolvable platform — a specialized AI/ML engineer with deep knowledge of integrating LLMs, Vision models, traditional ML endpoints, vector databases, and RAG architectures natively into web applications.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any AI or Machine Learning features requested (e.g., chat interfaces, image generation, classification endpoints, semantic search) and generate the specialized code (hooks, API routes, LangChain/OpenAI integrations) required to implement them natively in Next.js.

Rules:
1. Analyze the project intent for AI, LLM, or Machine Learning integrations.
2. Generate production-ready code that integrates with standard AI providers (e.g., OpenAI, Anthropic, Replicate, Pinecone, LangChain) or custom model endpoints.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no AI or ML features are requested or relevant, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "machineLearningCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class MachineLearningExpertAgent implements Agent {
    id = AgentId.MACHINE_LEARNING_EXPERT;
    name = 'Principal AI & Machine Learning Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if AI or Machine Learning features are required. If so, generate the necessary integration code.

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
