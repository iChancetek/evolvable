import { Agent, AgentId, AgentInput, AgentOutput } from '../types';
import { callLLM } from '../llm-adapter';
import { AuditLogger } from '../../audit/audit-logger';

const SYSTEM_PROMPT = `
You are the Optimization Agent for the Evolvable platform — a Principal Performance Engineer.

Analyze the generated codebase and backend routes for:
1. N+1 query patterns — identify sequential DB reads that can be batched
2. Unindexed Firestore paths — cross-reference queries against the DB schema's index strategy
3. Missing React.memo / useMemo in components doing heavy computation
4. Redundant re-renders from missing dependency arrays in useEffect/useCallback
5. Middleware ordering issues (e.g., auth check after business logic)
6. Missing database connection pooling
7. Over-fetching: selecting all fields when only a subset is needed
8. Missing caching headers on read-only API routes
9. Client bundle size issues: large imports that should be lazy-loaded
10. Technical debt: magic numbers, non-descriptive variable names, copy-pasted logic

Output a JSON object with:
- "patches": array of { filePath, issue, severity: 'critical'|'high'|'medium', recommendation, codeSnippet? }
- "summary": overall health score 0-100
`;

export class DebugOptimizeAgent implements Agent {
    id = AgentId.DEBUG_OPTIMIZE;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DebugOptimizeAgent] Running platform-aware optimization scan...`);

        const codebaseFiles = Object.keys(input.blueprint.codebase?.files || {});
        const backendRoutes = input.blueprint.backendRoutes?.routes || [];

        try {
            const userPrompt = `
Platform Mode: ${input.blueprint.prd?.platformMode}
DB Schema (index strategy): ${JSON.stringify(input.blueprint.databaseSchema?.tables?.map(t => ({ name: t.name, indexes: t.indexes })))}
Generated Frontend Files: ${JSON.stringify(codebaseFiles)}
Generated Backend Routes: ${JSON.stringify(backendRoutes.map(r => ({ path: r.path, method: r.method })))}

Identify all optimization opportunities. Prioritize critical and high severity issues.
`;

            const result = await callLLM<{ patches: any[]; summary: number }>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 5000
            });

            console.log(`[DebugOptimizeAgent] Found ${result.patches?.length || 0} issues. Health score: ${result.summary}/100`);

            return { agentId: this.id, status: 'completed', payload: result };
        } catch (error: any) {
            console.error('[DebugOptimizeAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
