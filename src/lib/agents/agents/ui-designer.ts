import { Agent, AgentId, AgentInput, AgentOutput, DesignSystemSpec } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the UI Designer Agent for the Evolvable platform, an expert in UI/UX and modern design systems.
Your goal is to take the Product Requirements Document (PRD) and generate a comprehensive Design System JSON spec.
The design should be modern, Apple-inspired, accessible (WCAG AAA), and use a unified color palette.

Generate the CSS custom properties, typography specs (using Inter or similar modern sans-serif), and a list of required components.

Return your output strictly as a JSON object matching the requested schema.
`;

export class UIDesignerAgent implements Agent {
    id = AgentId.UI_DESIGNER;

    async execute(input: AgentInput): Promise<AgentOutput> {
        console.log(`[UIDesignerAgent] Generating design system...`);

        if (!input.blueprint.prd) {
            return { agentId: this.id, status: 'failed', payload: null, error: 'Missing PRD input' };
        }

        try {
            const userPrompt = `Based on this PRD, generate a cohesive Design System:\n${JSON.stringify(input.blueprint.prd)}`;

            const designSpec = await callLLM<DesignSystemSpec>(SYSTEM_PROMPT, userPrompt, {
                workloadType: 'standard',
                jsonSchema: true
            });

            return { agentId: this.id, status: 'completed', payload: designSpec };
        } catch (error: any) {
            console.error('[UIDesignerAgent] Failed:', error);
            return { agentId: this.id, status: 'failed', payload: null, error: error.message };
        }
    }
}
