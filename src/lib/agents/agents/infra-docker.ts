import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';

export class InfraDockerAgent implements Agent {
    id = AgentId.INFRA_DOCKER;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[InfraDockerAgent] Generating Docker Configuration...`);

        if (!input.blueprint.infrastructure?.artifactsRequired.docker) {
            return { agentId: this.id, status: 'completed', payload: null };
        }

        const prompt = `
You are an expert DevOps and Containerization Engineer.
The user wants to containerize an application based on the following context:

Intent: ${input.blueprint.infrastructure.nliiSummary.interpretedIntent}
OS Context: ${input.blueprint.infrastructure.nliiSummary.identifiedOS}
Architecture: ${input.blueprint.architecture?.stack.backend || 'Node.js'}

Generate a production-ready Docker setup.

RULES:
1. Use multi-stage builds.
2. Run the application as a non-root user.
3. Include HEALTHCHECK instructions.
4. Optimize layer caching and minimize image size.
5. Provide a \`Dockerfile\` and a \`.dockerignore\` file.
6. Return ONLY valid JSON containing a map of filenames to their file contents. No markdown formatting.

Example output format:
{
    "files": {
        "Dockerfile": "FROM node:20-alpine AS builder\\n...",
        ".dockerignore": "node_modules/\\n.next/\\n..."
    },
    "dependencies": {}
}
`;

        try {
            const rawResponse = await callLLM(prompt, '', { provider: input.provider });
            const jsonText = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
            const payload: GeneratedCodebase = JSON.parse(jsonText);

            return {
                agentId: this.id,
                status: 'completed',
                payload
            };
        } catch (error: any) {
            console.error('[InfraDockerAgent] Failed:', error);
            return {
                agentId: this.id,
                status: 'failed',
                payload: null,
                error: error.message
            };
        }
    }
}
