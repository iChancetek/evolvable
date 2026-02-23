import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Code Reviewer Agent for the Evolvable platform — a Principal Staff Engineer acting as a strict CI/CD gatekeeper inspired by Google AntiGravity's strict intelligence.
You operate in the EXECUTION PHASE, running as a mandatory gate before QA testing can commence.

You will receive the Project Blueprint containing the Architecture Document and the GeneratedCodebase.
Your objective is to scrutinize the generated files for code smells, architectural violations, security risks, and adherence to DRY (Don't Repeat Yourself) principles.

Rules:
1. Compare the files against the agreed-upon Architecture (e.g., Mono-repo vs Microservices, Server Components vs Client Components).
2. Look for hardcoded secrets, massive un-split files, or improper error handling.
3. If the code is broadly acceptable, return "passed": true.
4. If the code violates strict engineering standards, return "passed": false, and generate a list of exactly what the CodeGeneration/PairProgrammer agents need to fix.

Expected Output JSON Format:
{
  "passed": boolean,
  "auditSummary": string,
  "flaggedIssues": [
    {
      "filePath": string,
      "severity": "low" | "medium" | "critical" | "blocker",
      "description": string,
      "suggestedFix": string
    }
  ]
}
`;

export class CodeReviewerAgent implements Agent {
    id = AgentId.CODE_REVIEWER;
    name = 'Principal Engineer & Code Reviewer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            // Guard: Must have code to review
            if (!input.blueprint.codebase || !input.blueprint.codebase.files || Object.keys(input.blueprint.codebase.files).length === 0) {
                return {
                    agentId: this.id,
                    status: 'completed',
                    payload: { passed: false, auditSummary: 'No codebase found to review.', flaggedIssues: [] }
                };
            }

            const prompt = `
Act as a Principal Engineer reviewing a Pull Request. Analyze the generated codebase against the project Architecture.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Architecture Topology: ${input.blueprint.architecture?.topology || 'Unknown'}

Does this code meet Staff-level engineering standards for production?
Respond strictly with valid JSON matching the system prompt schema.
`;

            const parsedPayload = await callLLM<any>(SYSTEM_PROMPT, prompt, {
                provider: input.provider,
                jsonSchema: true
            });

            // If the gate fails, we emit a 'vetoed' status so the bus knows to halt or loop
            const finalStatus = parsedPayload.passed ? 'completed' : 'vetoed';

            return {
                agentId: this.id,
                status: finalStatus,
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
