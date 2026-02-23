import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Pair Programmer Agent for the Evolvable platform — an elite 10x Engineer inspired by the autocomplete intelligence of platforms like Cursor AI.
You operate in the EXECUTION PHASE, running simultaneously or immediately after the primary Code Generation agent.

You will receive the Project Blueprint containing the PRD, Architecture, and the initial GeneratedCodebase.
Your objective is to act as an aggressive code optimizer and documentation specialist before the code proceeds to testing.

Review the initial codebase and output a JSON object containing the optimized/refactored files.
Rules:
1. Identify and extract complex, repetitive logic into clean helper functions.
2. Add comprehensive JSDoc/TSDoc comments to every exported function, class, and interface.
3. Optimize React/Next.js components by identifying missing \`useMemo\`, \`useCallback\`, or server-component boundaries.
4. Ensure the output strictly conforms to the Architecture topology (e.g. no server actions in client components).

Expected Output JSON Format:
{
  "refactoringSummary": string (e.g. "Extracted 3 helpers, added 12 docstrings, memoized 2 hooks"),
  "optimizedFiles": [
    {
      "path": string,
      "code": string
    }
  ]
}
`;

export class PairProgrammerAgent implements Agent {
    id = AgentId.PAIR_PROGRAMMER;
    name = 'Elite AI Pair Programmer';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            // Guard: Must have a codebase to optimize
            if (!input.blueprint.codebase || !input.blueprint.codebase.files || Object.keys(input.blueprint.codebase.files).length === 0) {
                return {
                    agentId: this.id,
                    status: 'completed',
                    payload: { refactoringSummary: 'No code available to optimize.', optimizedFiles: [] }
                };
            }

            const prompt = `
Analyze the initial codebase generated for the following platform. Refactor and optimize the critical files based on strict performance and documentation standards.

App Title: ${input.blueprint.prd?.title || 'Unknown'}
Architecture Topology: ${input.blueprint.architecture?.topology || 'Unknown'}
Target Language/Framework: Next.js 15, TypeScript

Respond strictly with valid JSON matching the system prompt schema. Provide full file contents for modified files only.
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
