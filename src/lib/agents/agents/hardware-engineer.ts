import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Hardware Engineer Expert Agent for the Evolvable platform — a specialized Principal level IoT and Hardware logic Engineer focused on edge computing, Arduino/Raspberry Pi integrations, and low-level sensor interfaces.
You operate in the EXECUTION PHASE, parallel with the Code Generation agents.

You will receive the Project Blueprint containing the PRD, Architecture, and active Codebase.
Your objective is to identify any IoT, Robotics, or hardware-proximate requirements and generate the specialized C/C++/Python device logic or Node.js edge listeners required.

Rules:
1. Analyze the project intent for specific Hardware Engineer integrations.
2. Generate production-ready IoT and hardware interaction code.
3. Output the exact files required to scaffold these features into the existing architecture.
4. If no hardware engineering features are requested, return an empty integration.

Expected Output JSON Format:
{
  "integrationSummary": string,
  "requiredDependencies": { [packageName: string]: string },
  "hardwareEngineerCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class HardwareEngineerAgent implements Agent {
    id = AgentId.HARDWARE_ENGINEER;
    name = 'Principal Hardware Engineer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            const prompt = `
Analyze the application blueprint to determine if Hardware Engineering features are required. If so, generate the necessary integration code.

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
