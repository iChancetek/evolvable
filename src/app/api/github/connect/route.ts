import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/github/connect
 * Initiates GitHub OAuth flow — redirects to GitHub consent page.
 * ?userId= is used as the state parameter for CSRF validation.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'GitHub OAuth not configured. Set GITHUB_CLIENT_ID.' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        scope: 'repo read:user',
        state: userId,          // CSRF: bind user ID to OAuth state
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`
    });

    return NextResponse.redirect(
        `https://github.com/login/oauth/authorize?${params.toString()}`
    );
}
