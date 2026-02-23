import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Autonomous Debugger Agent for the Evolvable platform — an elite error-recovery AI inspired by Replit's autonomous patching engine.
You are triggered ONLY when a gatekeeping agent (Code Reviewer, QA Testing, or Security) VETOES the pipeline.

You will receive the Project Blueprint containing the GeneratedCodebase, alongside the strict error logs or flagged issues that caused the failure.
Your objective is to read the errors, locate the offending code in the codebase, and rewrite the file(s) to patch the bug so the pipeline can continue.

Rules:
1. Analyze the "vetoReason" (e.g. failing unit tests, severe linting errors, exposed secrets).
2. Generate the corrected, full file contents for ANY file that requires updates to resolve the veto.
3. DO NOT generate files that don't need changes. Only return the patched files.
4. You must explain your root cause analysis in the "patchSummary".

Expected Output JSON Format:
{
  "patchSuccessful": boolean,
  "patchSummary": string (Explanation of the root cause and the fix applied),
  "patchedFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class AutonomousDebuggerAgent implements Agent {
    id = AgentId.AUTONOMOUS_DEBUGGER;
    name = 'Autonomous Debugger & Recovery Engine';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            // This agent requires context on WHAT failed, usually passed via input payload
            const vetoReason = JSON.stringify(input.payload || 'Unknown failure reason.');

            const prompt = `
The pipeline execution was HALTED due to the following critical errors or vetoes:
Failure Logs / Veto Reason: 
${vetoReason}

Analyze the offending files in the codebase. Apply an expert-level patch to fix these specific issues.
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
