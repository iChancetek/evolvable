import { Agent, AgentId, AgentInput, AgentOutput, DatabaseSchema, TenantIsolationStrategy } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Database Architect Agent for the Evolvable platform — an Agentic AI with super intelligence and brilliance specializing in multi-tenant, high-scale database systems.
Your goal is to build Next level, Production level databases. You operate in PLANNING MODE. Do NOT generate application code.

Based on the PRD and platform mode, design a complete, production-ready Database Schema using Neon PostgreSQL and Drizzle ORM by default (unless the user describes other methods, in which case you must follow their methods). Include Clerk Auth integration strategies.

Rules by platform mode:
- saas / multi_tenant: Every entity shared across tenants MUST point to an organization or tenant ID. Apply row-level security (RLS) in PostgreSQL.
- marketplace: Separate schemas for buyers, sellers, listings, transactions, escrow
- social: Optimize for fan-out writes, activity feeds, follow graphs (use proper foreign keys and indexes)
- enterprise_dashboard: Index-heavy, audit trail tables, time-series data patterns
- api_platform: API key table, usage metering table, webhook delivery log table
- single_app: Standard CRUD schema, no isolation needed

For EVERY table/collection, specify:
- All fields with types
- Which fields are indexed (and why)
- Foreign key / reference relationships
- Whether it is tenant-scoped (boolean)

Also generate:
- Query optimization patterns for the top 5 most frequent queries
- Row Level Security (RLS) policies if using Neon/Postgres
- Data isolation logic description

Return ONLY valid JSON matching the DatabaseSchema type.
`;

export class DBArchitectAgent implements Agent {
    id = AgentId.DB_ARCHITECT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DBArchitectAgent] Designing database schema for mode: ${input.blueprint.prd?.platformMode}`);

        if (!input.blueprint.prd) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD input' };
        }

        try {
            const platformMode = input.blueprint.prd.platformMode;
            const needsIsolation = ['saas', 'multi_tenant', 'marketplace'].includes(platformMode);

            const userPrompt = `
Platform Mode: ${platformMode}
Multi-tenant isolation required: ${needsIsolation}
Data Entities from PRD: ${JSON.stringify(input.blueprint.prd.dataEntities)}
User Roles: ${JSON.stringify(input.blueprint.prd.userRoles)}
All Features: ${JSON.stringify(input.blueprint.prd.features?.slice(0, 10))}

Design a complete, production-ready database schema favoring Neon Postgres and Drizzle ORM.
${needsIsolation ? 'CRITICAL: Apply tenant isolation (e.g. orgId) on ALL tenant-scoped collections. Define Row Level Security (RLS) policies.' : ''}
`;

            const schema = await callLLM<DatabaseSchema>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                provider: input.provider,
                jsonSchema: true,
                maxTokens: 6000
            });

            console.log(`[DBArchitectAgent] Schema generated. Engine: ${schema.engine}. Tables: ${schema.tables?.length || 0}. Isolation: ${schema.isolationStrategy}`);

            return { agentId: this.id, status: 'completed', payload: schema };
        } catch (error: any) {
            console.error('[DBArchitectAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
