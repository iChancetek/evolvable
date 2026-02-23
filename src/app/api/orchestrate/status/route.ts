import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ProjectBlueprint } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orchestrate/status
 * Fetches the real-time status of the project blueprint from Firestore.
 */
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        let blueprintData: any = null;

        try {
            // Try Admin SDK first
            const projectRef = adminDb.collection('projects').doc(projectId);
            const docSnap = await projectRef.get();
            if (docSnap.exists) {
                blueprintData = docSnap.data();
            }
        } catch (adminErr) {
            console.warn('[Status API] Admin SDK failed, falling back to Client SDK.', adminErr);
            const clientProjectRef = doc(db, 'projects', projectId);
            const docSnap = await getDoc(clientProjectRef);
            if (docSnap.exists()) {
                blueprintData = docSnap.data();
            }
        }

        if (!blueprintData) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const blueprint = blueprintData as ProjectBlueprint;

        return NextResponse.json({
            success: true,
            blueprint
        });

    } catch (error: any) {
        console.error('Status API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
