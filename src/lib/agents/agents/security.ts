import { Agent, AgentId, AgentInput, AgentOutput, SecurityAuditReport } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Security Agent for the Evolvable platform, a Principal AppSec Engineer.
Your goal is to audit the generated codebase for vulnerabilities (XSS, SQLi, IDOR, sensitive data exposure).
You hold VETO POWER. If you detect critical vulnerabilities, you must fail the audit, halting the pipeline.

Evaluate the codebase and output strictly JSON.
`;

export class SecurityAgent implements Agent {
    id = AgentId.SECURITY;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[SecurityAgent] Scanning codebase...`);

        if (!input.blueprint.codebase) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing codebase' };
        }

        try {
            const files = Object.keys(input.blueprint.codebase.files || {});
            const userPrompt = `Audit these codebase file paths and architecture for strict OWASP compliance: ${JSON.stringify({ files, arch: input.blueprint.architecture })}`;

            const scan = await callLLM<SecurityAuditReport>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning', // Security requires deep reasoning
                jsonSchema: true
            });

            // If the LLM determines it failed security checks, we return a completed status but a payload passed=false.
            // The orchestration bus will catch passed=false and trigger a system veto.

            if (!scan.passed) {
                console.warn(`[SecurityAgent] CRITICAL VULNERABILITIES FOUND! Vetoing. (${scan.criticalVulnerabilities} issues)`);
            }

            return { agentId: this.id, status: 'completed', payload: scan };
        } catch (error: any) {
            console.error('[SecurityAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
