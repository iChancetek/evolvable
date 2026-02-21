import { NextRequest, NextResponse } from 'next/server';
import { GitHubTokenService } from '@/lib/github/github-token-service';
import { AuditLogger } from '@/lib/audit/audit-logger';

/**
 * GET /api/github/callback
 * GitHub OAuth callback — exchanges code for access token, stores encrypted token.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains userId (set in /connect)

    if (!code || !state) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/github?error=missing_params`);
    }

    const userId = state; // Trust: state = userId from our own redirect

    try {
        // Step 1: Exchange code for access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error('[GitHub Callback] Token exchange error:', tokenData.error_description);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/github?error=${tokenData.error}`);
        }

        const accessToken: string = tokenData.access_token;
        const scope: string = tokenData.scope || '';

        // Step 2: Fetch GitHub user profile
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        const githubUser = await userRes.json();

        // Step 3: Encrypt + store token
        const tokenService = new GitHubTokenService(userId);
        await tokenService.storeToken(
            accessToken,
            githubUser.login,
            githubUser.id,
            githubUser.avatar_url,
            scope
        );

        // Step 4: Audit log
        const auditLogger = new AuditLogger(userId);
        await auditLogger.log('github_account_linked', `GitHub account @${githubUser.login} connected`, { userId });

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/github?connected=true`);

    } catch (err: any) {
        console.error('[GitHub Callback] Error:', err);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/github?error=server_error`);
    }
}
