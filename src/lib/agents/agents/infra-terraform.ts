import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';

export class InfraTerraformAgent implements Agent {
    id = AgentId.INFRA_TERRAFORM;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[InfraTerraformAgent] Generating Terraform Configuration...`);

        if (!input.blueprint.infrastructure?.artifactsRequired.terraform) {
            return { agentId: this.id, status: 'completed', payload: null };
        }

        const prompt = `
You are an expert DevOps and Cloud Architect specializing in Terraform.
The user wants to generate infrastructure based on the following blueprint:

Intent: ${input.blueprint.infrastructure.nliiSummary.interpretedIntent}
Cloud Provider: ${input.blueprint.infrastructure.nliiSummary.identifiedCloud}
Compute: ${JSON.stringify(input.blueprint.infrastructure.compute)}
Networking: ${JSON.stringify(input.blueprint.infrastructure.networking)}
Security: ${JSON.stringify(input.blueprint.infrastructure.security)}

Generate production-ready Terraform code that implements this architecture.

RULES:
1. Do NOT use hardcoded credentials. Use variables (\`variables.tf\`).
2. Include a \`provider.tf\` with appropriate versions.
3. Include a \`main.tf\` for core resources.
4. Include an \`outputs.tf\`.
5. Ensure state is configured for remote backend (e.g. S3/GCS) appropriately abstractly.
6. Return ONLY valid JSON containing a map of filenames to their file contents. No markdown formatting.

Example output format:
{
    "files": {
        "main.tf": "resource \\"aws_vpc\\" \\"main\\" { ... }",
        "variables.tf": "variable \\"region\\" { ... }",
        "provider.tf": "terraform { ... }",
        "outputs.tf": "output \\"vpc_id\\" { ... }"
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
            console.error('[InfraTerraformAgent] Failed:', error);
            return {
                agentId: this.id,
                status: 'failed',
                payload: null,
                error: error.message
            };
        }
    }
}
