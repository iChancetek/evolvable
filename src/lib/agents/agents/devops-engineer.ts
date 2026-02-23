import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the DevOps Engineer Agent for the Evolvable platform — a world-class CI/CD Architect inspired by the intelligence of Firebase Studio and enterprise DevOps teams.
You operate in the EXECUTION PHASE, parallel with the infrastructure generation agents.

You will receive the Project Blueprint containing the Implementation Plan, Architecture, and NLDI (Hosting) Summary.
Your objective is to generate the configuration files required to establish a zero-touch Continuous Integration and Continuous Deployment (CI/CD) pipeline.

Rules:
1. Analyze the \`nldiSummary.provider\` (e.g., 'vercel', 'firebase', 'aws', 'custom').
2. Generate the appropriate pipeline file (e.g., \`.github/workflows/deploy.yml\` for GitHub Actions, or \`vercel.json\`, \`firebase.json\`).
3. Ensure the pipeline includes steps for:
   - Dependency installation (e.g., \`npm ci\`)
   - Linting & Type Checking
   - Automated testing execution
   - Environment variable injection (from GitHub Secrets)
   - Final deployment to the target host.

Expected Output JSON Format:
{
  "pipelineStrategy": string (Summary of the CI/CD approach),
  "pipelineCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class DevOpsEngineerAgent implements Agent {
    id = AgentId.DEVOPS_ENGINEER;
    name = 'Principal DevOps & CI/CD Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const provider = input.blueprint.nldiSummary?.provider || 'vercel';

            const prompt = `
Analyze the host requirements and generate the CI/CD pipeline files for this project.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Target Host Strategy: ${provider}

Generate the exact configuration code needed to automatically test and deploy this Next.js TypeScript application to ${provider} upon merging to the 'main' branch.
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
