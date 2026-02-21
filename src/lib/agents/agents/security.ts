import { Agent, AgentId, AgentInput, AgentOutput, SecurityAuditReport } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Security Agent for the Evolvable platform — a Principal AppSec Engineer and Penetration Tester.
You hold VETO POWER. You may halt the entire deployment pipeline.

Your mandate:
1. Audit ALL generated API routes for:
   - Missing authentication guards (open endpoints)
   - Missing RBAC enforcement
   - SQL/NoSQL injection vectors
   - XSS attack surfaces in generated frontend
   - Tenant data isolation breaches (IDOR)
   - Least-privilege violations
   - Missing input validation
   - Missing rate limiting

2. Simulate FIVE attack scenarios and report pass/fail for each:
   - IDOR: Can user A access user B's data?
   - Privilege Escalation: Can a viewer perform admin actions?
   - Tenant Bleed: Can tenant A read tenant B's data?
   - SQL/NoSQL Injection: Is user input properly sanitised?
   - XSS: Can malicious script be injected via form inputs?

3. Check for drift from the approved security plan:
   - Compare generated routes against the approved securityPlan.routeProtection[]
   - Flag any unprotected routes as critical

4. Set "passed: true" ONLY if zero critical vulnerabilities found.
   Set "passed: false" and halt if ANY critical issue exists.

Return ONLY valid JSON matching the SecurityAuditReport schema.
`;

export class SecurityAgent implements Agent {
    id = AgentId.SECURITY;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[SecurityAgent] Running comprehensive security audit...`);

        if (!input.blueprint.codebase) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing codebase' };
        }

        const auditLogger = new AuditLogger(input.projectId);

        // Retrieve the approved security plan for drift detection
        const approvedPlan = input.blueprint.planVersions?.find(
            v => v.version === input.blueprint.activePlanVersion
        )?.plan;

        try {
            const files = Object.keys(input.blueprint.codebase.files || {});
            const backendRoutes = input.blueprint.backendRoutes?.routes || [];

            const userPrompt = `
Platform Mode: ${input.blueprint.prd?.platformMode}
RBAC Policy: ${JSON.stringify(input.blueprint.architecture?.rbacPolicy)}
Tenant Isolation Strategy: ${input.blueprint.architecture?.tenantIsolation}
Generated API Routes: ${JSON.stringify(backendRoutes.map(r => ({ path: r.path, method: r.method, auth: r.auth, roles: r.roles })))}
Generated Frontend Files: ${JSON.stringify(files)}
Architecture: ${JSON.stringify(input.blueprint.architecture)}
Approved Security Plan: ${JSON.stringify(approvedPlan?.securityPlan)}
Approved Route Protection List: ${JSON.stringify(approvedPlan?.securityPlan?.routeProtection)}

Audit the codebase. Simulate all 5 attack scenarios. Check drift from approved security plan. Return SecurityAuditReport.
`;

            const scan = await callLLM<SecurityAuditReport>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 6000
            });

            if (!scan.passed) {
                console.warn(`[SecurityAgent] SECURITY VETO — ${scan.criticalVulnerabilities} critical issues found.`);
                await auditLogger.securityVeto(scan.criticalVulnerabilities);
            }

            if (scan.driftFromPlan) {
                await auditLogger.planDrift(AgentId.SECURITY, 'Security implementation diverged from approved security plan.');
            }

            return { agentId: this.id, status: 'completed', payload: scan };
        } catch (error: any) {
            console.error('[SecurityAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
