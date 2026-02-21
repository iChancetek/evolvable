import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/agents/llm-adapter';
import { VisualLayout } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/builder-assist
 * Accepts a natural-language prompt and the current canvas layout.
 * Returns a { patch: { nodeId, updatedProps } } object to apply to the AST.
 */
export async function POST(req: NextRequest) {
    try {
        const { prompt, currentLayout, projectId }: {
            prompt: string;
            currentLayout: VisualLayout;
            projectId?: string;
        } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const pageId = currentLayout.activePage;
        const activePage = currentLayout.pages.find(p => p.id === pageId);
        const nodesSummary = activePage?.nodes.map(n => `id="${n.id}" type="${n.type}" content="${n.props.content ?? ''}"`).join('\n') ?? 'No nodes yet.';

        const systemPrompt = `You are an AI visual builder assistant. The user has a canvas with the following blocks:

${nodesSummary}

The user says: "${prompt}"

Identify which single block ID should be updated to best fulfill this request. Return ONLY this JSON structure (no markdown, no explanation):

{
  "nodeId": "<block id>",
  "updatedProps": {
    "bgColor": "<hex or transparent>",
    "textColor": "<hex>",
    "content": "<new content if applicable>"
  }
}

Only include props that should actually change. Use hex color values.`;

        const raw = await callLLM(
            systemPrompt,
            'openai',
            { maxTokens: 400 }
        );

        // Extract JSON from response
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
            return NextResponse.json({ error: 'AI returned invalid response', raw }, { status: 200 });
        }

        const patch = JSON.parse(match[0]);
        return NextResponse.json({ patch, projectId });

    } catch (error: any) {
        console.error('[Builder Assist] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
