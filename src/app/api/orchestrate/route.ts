import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';
import { OrchestrationBus } from '@/lib/agents/orchestration-bus';
import { ProjectBlueprint, AgentId } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orchestrate
 * Starts the autonomous agent orchestration pipeline for a new application idea.
 */
export async function POST(req: NextRequest) {
    try {
        const { idea, userId } = await req.json();

        if (!idea) {
            return NextResponse.json({ error: 'Idea prompt is required' }, { status: 400 });
        }

        // Generate a new project ID
        const projectRef = doc(collection(db, 'projects'));
        const projectId = projectRef.id;

        // Initialize the empty blueprint
        const initialBlueprint: ProjectBlueprint = {
            id: projectId,
            userId: userId || 'anonymous',
            originalPrompt: idea,
            createdAt: Date.now(),
            adrLog: [],
            currentPhase: AgentId.VISION, // Starts with vision agent
            status: 'building'
        };

        // Save initial state to Firestore
        await setDoc(projectRef, initialBlueprint);

        // We run the orchestrator asynchronously in the background so we don't block the response
        // In a true serverless environment like Vercel, background tasks might need 
        // a different pattern (like Vercel Functions with waitUntil or a queue worker).
        // For MVP, since we use Firebase, we can kick it off here.

        try {
            // Instantiate OrchestrationBus without blocking the return
            const bus = new OrchestrationBus(initialBlueprint);
            bus.executePipeline().catch(e => console.error('[API Route] Background pipeline crash:', e));
        } catch (error) {
            console.error('[API Route] Failed to start pipeline:', error);
        }

        // Return immediately with the new project ID so the client can start polling for status
        return NextResponse.json({
            success: true,
            projectId,
            message: 'Pipeline initiated.'
        });

    } catch (error: any) {
        console.error('Orchestration API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
