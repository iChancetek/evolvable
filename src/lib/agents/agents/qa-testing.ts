import { Agent, AgentId, AgentInput, AgentOutput, TestSuite } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the QA Testing Agent for the Evolvable platform — a Senior QA Engineer and Automation Architect.
You generate a comprehensive test suite AND simulate execution to determine pass/fail status.

Generate tests covering:
1. Unit Tests — business logic functions, utility helpers, data transformations
2. Integration Tests — API route request/response cycles, DB read/write operations
3. Auth Flow Tests — sign up, sign in, token refresh, sign out, protected route redirect
4. RBAC Matrix Tests — for EVERY user role × EVERY API route:
   - Verify allowed roles CAN access
   - Verify disallowed roles receive 403
5. Edge Cases — empty inputs, max payload sizes, concurrent requests, expired sessions

IMPORTANT:
- Cross-reference against the approved plan's testingPlan section
- Flag any test gap (planned test not covered) as a warning
- Set "passed: true" only if ALL critical auth and RBAC tests pass
- Set "passed: false" if any critical test fails — this BLOCKS deployment
- Coverage should be above 80% to pass

Return ONLY valid JSON matching the TestSuite type.
`;

export class QATestingAgent implements Agent {
    id = AgentId.QA_TESTING;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[QATestingAgent] Generating and simulating test suite...`);

        if (!input.blueprint.codebase) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing codebase' };
        }

        const auditLogger = new AuditLogger(input.projectId);
        const approvedPlan = input.blueprint.planVersions?.find(
            v => v.version === input.blueprint.activePlanVersion
        )?.plan;

        try {
            const files = Object.keys(input.blueprint.codebase.files || {});
            const backendRoutes = input.blueprint.backendRoutes?.routes || [];

            const userPrompt = `
Platform Mode: ${input.blueprint.prd?.platformMode}
User Roles: ${JSON.stringify(input.blueprint.prd?.userRoles)}
API Routes (generated): ${JSON.stringify(backendRoutes.map(r => ({ path: r.path, method: r.method, roles: r.roles })))}
RBAC Policy: ${JSON.stringify(input.blueprint.architecture?.rbacPolicy)}
Approved Testing Plan: ${JSON.stringify(approvedPlan?.testingPlan)}
Codebase Files: ${JSON.stringify(files.slice(0, 20))}

Generate the complete TestSuite. Simulate all tests. Return pass/fail for each.
Block deployment if any auth or RBAC test fails.
`;

            const suite = await callLLM<TestSuite>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 6000
            });

            if (!suite.passed) {
                console.warn(`[QATestingAgent] QA GATE FAILED — coverage: ${suite.coverage}%`);
                await auditLogger.qaGateFailed(suite.coverage);
            } else {
                console.log(`[QATestingAgent] QA GATE PASSED — coverage: ${suite.coverage}%`);
            }

            return { agentId: this.id, status: 'completed', payload: suite };
        } catch (error: any) {
            console.error('[QATestingAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
