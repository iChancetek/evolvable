import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';
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

        // Layer 1: AI Configuration Guard (Pre-flight validation)
        const requiresOpenAI = llmProvider === 'openai';
        const requiresDeepSeekOrHF = llmProvider === 'deepseek' || llmProvider === 'huggingface';
        const requiresAnthropic = llmProvider === 'anthropic';

        if (requiresOpenAI && !process.env.OPENAI_API_KEY) {
            console.warn('[AI Guard] Blocked execution due to missing OPENAI_API_KEY');
            return NextResponse.json({
                success: false,
                status: 'degraded',
                fallback: true,
                message: 'AI workspace is initializing.'
            }, { status: 503 });
        }

        if (requiresDeepSeekOrHF && !(process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN)) {
            console.warn('[AI Guard] Blocked execution due to missing HF_TOKEN');
            return NextResponse.json({
                success: false,
                status: 'degraded',
                fallback: true,
                message: 'AI workspace is initializing.'
            }, { status: 503 });
        }

        if (requiresAnthropic && !process.env.ANTHROPIC_API_KEY) {
            console.warn('[AI Guard] Blocked execution due to missing ANTHROPIC_API_KEY');
            return NextResponse.json({
                success: false,
                status: 'degraded',
                fallback: true,
                message: 'AI workspace is initializing.'
            }, { status: 503 });
        }

        let projectId = '';

        try {
            // Try Admin SDK first (works in Vercel/App Hosting)
            const projectRef = adminDb.collection('projects').doc();
            projectId = projectRef.id;
        } catch (adminErr) {
            console.warn('[API Route] Admin SDK failed, falling back to Client SDK for ID generation.', adminErr);
            const clientProjectRef = doc(collection(db, 'projects'));
            projectId = clientProjectRef.id;
        }

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
        try {
            const projectRef = adminDb.collection('projects').doc(projectId);
            await projectRef.set(initialBlueprint);
        } catch (adminErr) {
            console.warn('[API Route] Admin SDK write failed, falling back to Client SDK. Using local auth credentials.');
            const clientProjectRef = doc(db, 'projects', projectId);
            await setDoc(clientProjectRef, initialBlueprint);
        }

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
