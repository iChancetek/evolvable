import { Agent, AgentId, AgentInput, AgentOutput, GeneratedCodebase } from '../types';
import { callLLM } from '../llm-adapter';

export class InfraScriptAgent implements Agent {
    id = AgentId.INFRA_SCRIPT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[InfraScriptAgent] Generating Deployment Scripts...`);

        const needsBash = input.blueprint.infrastructure?.artifactsRequired.bash;
        const needsPowershell = input.blueprint.infrastructure?.artifactsRequired.powershell;

        if (!needsBash && !needsPowershell) {
            return { agentId: this.id, status: 'completed', payload: null };
        }

        const prompt = `
You are an expert Systems Administrator and DevOps Automation Engineer.
The user wants automation scripts based on this intent:

Intent: ${input.blueprint.infrastructure?.nliiSummary.interpretedIntent}
Target OS: ${input.blueprint.infrastructure?.nliiSummary.identifiedOS}
Cloud: ${input.blueprint.infrastructure?.nliiSummary.identifiedCloud}

Generate the requested scripts.

RULES FOR BASH:
1. Always use \`set -e\` (fail fast).
2. Validate required arguments/environment variables.
3. Be idempotent (can be run multiple times safely).
4. Include echo statements for logging steps.
5. Provide a \`deploy.sh\`.

RULES FOR POWERSHELL:
1. Use \`$ErrorActionPreference = 'Stop'\`.
2. Use parameter blocks \`param(...)\`.
3. Include \`Write-Host\` for logging.
4. Provide a \`deploy.ps1\`.

Only generate the scripts explicitly requested by the blueprint.
Return ONLY valid JSON containing a map of filenames to their file contents. No markdown formatting.

Example output format:
{
    "files": {
        "deploy.sh": "#!/bin/bash\\nset -e\\n...",
        "deploy.ps1": "param([string]$env)\\n..."
    },
    "dependencies": {}
}
`;

        try {
            const rawResponse = await callLLM(prompt, input.provider || 'openai');
            const jsonText = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
            const payload: GeneratedCodebase = JSON.parse(jsonText);

            return {
                agentId: this.id,
                status: 'completed',
                payload
            };
        } catch (error: any) {
            console.error('[InfraScriptAgent] Failed:', error);
            return {
                agentId: this.id,
                status: 'failed',
                payload: null,
                error: error.message
            };
        }
    }
}
