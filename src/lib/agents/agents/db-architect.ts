import { Agent, AgentId, AgentInput, AgentOutput, DatabaseSchema } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Database Architect Agent for the Evolvable platform, a principal data engineer.
Your goal is to parse the Product Requirements Data Entities and generate a complete, normalized Database Schema JSON.
Choose the best engine (PostgreSQL, MongoDB, or Firestore) based on the app type.
Include all tables/collections, columns/fields, data types, indexes, and relationships.

Return your output strictly as JSON.
`;

export class DBArchitectAgent implements Agent {
    id = AgentId.DB_ARCHITECT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[DBArchitectAgent] Designing database schema...`);

        if (!input.blueprint.prd) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD input' };
        }

        try {
            const userPrompt = `Design a database schema for this PRD:\n${JSON.stringify(input.blueprint.prd)}`;

            const schema = await callLLM<DatabaseSchema>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning', // Use reasoning model for complex data architectures
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: schema };
        } catch (error: any) {
            console.error('[DBArchitectAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
