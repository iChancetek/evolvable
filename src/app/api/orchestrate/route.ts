import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { OrchestrationBus } from '@/lib/agents/orchestration-bus';
import { ProjectBlueprint, AgentId } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orchestrate
 * Starts Phase 1 (Planning) of the autonomous agent pipeline for a new project idea.
 * Phase 2 (Execution) is gated behind user approval at /api/orchestrate/approve.
 */
export async function POST(req: NextRequest) {
    try {
        const { idea, userId, llmProvider = 'openai' } = await req.json();

        if (!idea) {
            return NextResponse.json({ error: 'Idea prompt is required' }, { status: 400 });
        }

        const projectRef = adminDb.collection('projects').doc();
        const projectId = projectRef.id;

        // Initialize the blueprint with all required two-phase pipeline fields
        const initialBlueprint: ProjectBlueprint = {
            id: projectId,
            userId: userId || 'anonymous',
            originalPrompt: idea,
            createdAt: Date.now(),
            adrLog: [],
            planVersions: [],
            activePlanVersion: 0,
            currentPhase: AgentId.VISION,
            phase: 'planning',
            status: 'building',
            llmProvider
        };

        // Persist initial state
        await projectRef.set(initialBlueprint);

        // Kick off Phase 1 — Planning only, non-blocking
        const bus = new OrchestrationBus(initialBlueprint);
        bus.executePlanningPhase().catch(e => console.error('[API Route] Planning pipeline crash:', e));

        return NextResponse.json({
            success: true,
            projectId,
            message: 'Planning phase initiated. Agents are generating your implementation plan.'
        });

    } catch (error: any) {
        console.error('Orchestration API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
