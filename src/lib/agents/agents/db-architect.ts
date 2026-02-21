import { Agent, AgentId, AgentInput, AgentOutput, DatabaseSchema, TenantIsolationStrategy } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Database Architect Agent for the Evolvable platform — a Principal Data Engineer specializing in multi-tenant systems.
You operate in PLANNING MODE. Do NOT generate application code.

Based on the PRD and platform mode, design a complete, production-ready Database Schema.

Rules by platform mode:
- saas / multi_tenant: Every entity shared across tenants MUST have a "tenantId" field as the first field. Apply row-level or schema-level isolation. Generate Firestore security rules enforcing tenant data isolation.
- marketplace: Separate schemas for buyers, sellers, listings, transactions, escrow
- social: Optimize for fan-out writes, activity feeds, follow graphs (denormalize strategically)
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
- Firestore security rules if using Firestore
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

Design a complete, production-ready database schema.
${needsIsolation ? 'CRITICAL: Apply tenantId isolation on ALL tenant-scoped collections. Generate Firestore security rules.' : ''}
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
