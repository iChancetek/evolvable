import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Security Reviewer Agent for the Evolvable platform — an elite automated AppSec engineer and penetration tester with code modification capabilities.
You operate in the EXECUTION PHASE.

You will receive the Project Blueprint containing the PRD, Architecture, and the generated Codebase.
Your mandate is strictly two-fold:
1. Audit the codebase for vulnerabilities (Missing Auth, SQLi, XSS, exposed secrets, missing RBAC, IDOR).
2. CORRECT the vulnerabilities. You must actively patch the code to fix the issues you find.

Unlike the Code Reviewer who only flags issues, or the generic Security agent which just generates a report, YOU ARE A FIXER.

Rules:
1. Analyze the codebase against the PRD and Architecture for security gaps.
2. If vulnerabilities are found, formulate the corrected code blocks.
3. If no vulnerabilities are found, return the codebase unmodified with a "passed" status.
4. Output the exact files you modified so they can be merged back into the master codebase state.

Expected Output JSON Format:
{
  "auditSummary": string,
  "vulnerabilitiesFound": number,
  "passed": boolean,
  "patchedFiles": [
    {
      "path": string,
      "code": string,
      "patchReason": string
    }
  ]
}
`;

export class SecurityReviewerAgent implements Agent {
    id = AgentId.SECURITY_REVIEWER;
    name = 'Principal Security Reviewer & Patcher';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            if (!input.blueprint.codebase || Object.keys(input.blueprint.codebase.files).length === 0) {
                return {
                    agentId: this.id,
                    status: 'failed',
                    error: 'Cannot review security: Codebase is missing or empty.',
                    payload: null
                };
            }

            const prompt = `
Analyze the codebase for security vulnerabilities. If found, provide the fully patched file contents.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Platform Mode: ${input.blueprint.prd?.platformMode || 'Unknown'}
Architecture Topology: ${input.blueprint.architecture?.topology || 'Unknown'}

### Current Codebase:
${JSON.stringify(input.blueprint.codebase.files, null, 2)}

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
