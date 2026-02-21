import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { AuditLogger } from '@/lib/audit/audit-logger';

/**
 * POST /api/github/disconnect
 * Revokes the GitHub integration, deletes the encrypted token from Firestore.
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

        const tokenService = new GitHubTokenService(userId);
        const record = await tokenService.getRecord();

        if (!record) {
            return NextResponse.json({ error: 'No GitHub account connected' }, { status: 404 });
        }

        await tokenService.revokeToken();

        const auditLogger = new AuditLogger(userId);
        await auditLogger.log('github_account_unlinked', `GitHub account @${record.githubLogin} disconnected`, { userId });

        return NextResponse.json({ success: true, message: `@${record.githubLogin} disconnected.` });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
