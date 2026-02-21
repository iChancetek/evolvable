import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { ProjectBlueprint } from '@/lib/agents/types';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
        }

        console.log(`[DeployAPI] Fetching blueprint for project: ${projectId}`);
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const blueprint = docSnap.data() as ProjectBlueprint;

        if (!blueprint.codebase || !blueprint.codebase.files) {
            return NextResponse.json({ error: 'Project codebase has not been generated yet.' }, { status: 400 });
        }

        // Define the output directory for this mock local deployment
        const buildDir = path.join(process.cwd(), '.evolvable-builds', projectId);

        console.log(`[DeployAPI] Writing ${Object.keys(blueprint.codebase.files).length} files to ${buildDir}`);

        // Write every file from the generated codebase to the local disk
        for (const [filePath, fileContent] of Object.entries(blueprint.codebase.files)) {
            const absolutePath = path.join(buildDir, filePath);
            const dir = path.dirname(absolutePath);

            // Ensure the nested directories exist
            await fs.mkdir(dir, { recursive: true });

            // Write the file
            await fs.writeFile(absolutePath, fileContent, 'utf-8');
        }

        console.log(`[DeployAPI] System successfully assembled at ${buildDir}`);

        // --------------------------------------------------------------------------------
        // Note for MVP Phase 3: 
        // We have successfully written the AI's Output (React/NextJS app + Dockerfile)
        // to the local disk. In a full production environment, this is where we would trigger
        // Vercel CLI, Firebase App Hosting, or a docker build command.
        // --------------------------------------------------------------------------------

        return NextResponse.json({
            success: true,
            message: 'Codebase assembled successfully',
            buildDirectory: buildDir,
            liveUrl: blueprint.deploymentManifest?.liveUrl || 'http://localhost:3000'
        });

    } catch (error: any) {
        console.error('[DeployAPI] Error during deployment process:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
