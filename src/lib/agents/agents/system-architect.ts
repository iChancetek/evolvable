import { Agent, AgentId, AgentInput, AgentOutput, ArchitectureDesignDocument } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the System Architect Agent for the Evolvable platform, a Principal Software Engineer.
Your goal is to take the DB Schema, UI Design, and PRD, and define the complete technical architecture.
Based on the Evolvable framework standards:
- Frontend: Next.js 16 (App Router), React 19, CSS Modules
- Backend: Next.js API Routes (Serverless)
- Database: Provided from DB Architect
- State Management: React Context + Hooks
- Auth: Firebase Authentication

Generate a cohesive Architecture Design Document (ADD) outlining the stack, the service topology, and the internal API contracts required to connect the frontend to the database.
Return strictly JSON.
`;

export class SystemArchitectAgent implements Agent {
    id = AgentId.SYSTEM_ARCHITECT;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[SystemArchitectAgent] Designing system architecture...`);

        if (!input.blueprint.prd || !input.blueprint.databaseSchema) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD or DB Schema' };
        }

        try {
            const userPrompt = `PRD: ${JSON.stringify(input.blueprint.prd)}\n\nSchema: ${JSON.stringify(input.blueprint.databaseSchema)}`;

            const req = await callLLM<ArchitectureDesignDocument>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'reasoning',
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: req };
        } catch (error: any) {
            console.error('[SystemArchitectAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
