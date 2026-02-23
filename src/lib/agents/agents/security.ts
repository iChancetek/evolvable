import { Agent, AgentId, AgentInput, AgentOutput, SecurityAuditReport } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Security Agent for the Evolvable platform — a Principal AppSec Engineer and Penetration Tester.
You hold VETO POWER. You may halt the entire deployment pipeline.

Your mandate:
1. Audit ALL generated code (App & Infrastructure) for:
   - Missing authentication guards (open endpoints)
   - Missing RBAC enforcement
   - SQL/NoSQL injection vectors
   - Tenant data isolation breaches (IDOR)
   - Infrastructure: Open ports (e.g. 0.0.0.0/0 on port 22 or 3389)
   - Infrastructure: Publicly exposed databases or storage buckets
   - Infrastructure: Over-permissioned IAM roles (e.g. * on *)
   - Infrastructure: Hardcoded secrets or missing encryption
   - Docker: Root user execution or bloated vulnerable bases

2. Simulate SEVEN attack scenarios and report pass/fail for each:
   - IDOR: Can user A access user B's data?
   - Privilege Escalation: Can a viewer perform admin actions?
   - Tenant Bleed: Can tenant A read tenant B's data?
   - SQL/NoSQL Injection: Is user input properly sanitised?
   - XSS: Can malicious script be injected via form inputs?
   - Container Breakout: Does the Docker setup allow container escape?
   - Cloud Blast Radius: Does the Terraform config restrict public cloud access?

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
Security Plan: ${JSON.stringify(approvedPlan?.securityPlan)}
Infrastructure Blueprint: ${JSON.stringify(input.blueprint.infrastructure)}

Generated Files List: ${JSON.stringify(files)}
Generated API Routes: ${JSON.stringify(backendRoutes.map(r => ({ path: r.path, auth: r.auth, roles: r.roles })))}

Terraform Artifacts: ${input.blueprint.infraTerraform ? JSON.stringify(input.blueprint.infraTerraform.files) : 'None'}
Docker Artifacts: ${input.blueprint.infraDocker ? JSON.stringify(input.blueprint.infraDocker.files) : 'None'}
Script Artifacts: ${input.blueprint.infraScript ? JSON.stringify(input.blueprint.infraScript.files) : 'None'}

Perform a rigorous security audit of the application and infrastructure code.
Return ALL properties of SecurityAuditReport.
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
