import { Agent, AgentId, AgentInput, AgentOutput, DeploymentManifest } from '../types';
import { callLLM } from '../llm-adapter';
import { DockerGenerator } from '../../deployment/docker-generator';

const SYSTEM_PROMPT = `
You are the DevOps Deployment Agent for the Evolvable platform.
Your goal is to take a validated Next.js codebase and define the exact deployment manifest for Firebase App Hosting or Vercel edge deployment.

Output strictly JSON describing the provider, initial live URL stub, and resource requirements.
`;

export class DeploymentAgent implements Agent {
    id = AgentId.DEPLOYMENT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DeploymentAgent] Generating infrastructure and deployment manifests...`);

        if (!input.blueprint.codebase) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing codebase' };
        }

        try {
            const userPrompt = `Generate a deployment manifest for a Next.js 16 App Router application.`;

            const manifest = await callLLM<DeploymentManifest>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                jsonSchema: true
            });

            // Inject Docker config into the final codebase
            if (input.blueprint.codebase) {
                input.blueprint.codebase = DockerGenerator.injectDockerConfig(input.blueprint.codebase);
            }

            // Simulate the generated stub URL for the new project
            if (manifest) {
                manifest.liveUrl = `http://localhost:${Math.floor(Math.random() * 1000) + 3000}`;
            }

            return { agentId: this.id, status: 'completed', payload: manifest };
        } catch (error: any) {
            console.error('[DeploymentAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
