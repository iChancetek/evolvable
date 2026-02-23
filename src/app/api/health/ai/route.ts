import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ai
 * 
 * Lightweight health check endpoint to verify AI service connectivity.
 * Used by the frontend UI to display "Degraded" or "Warming Up" states
 * instead of letting users experience hard failures.
 */
export async function GET() {
    try {
        const provider = process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openai';

        if (provider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({
                    status: 'degraded',
                    provider: 'openai',
                    message: 'Missing OPENAI_API_KEY'
                }, { status: 503 });
            }

            const openai = new OpenAI({ apiKey });

            // Lightweight ping: fetch the models list. Uses 0 tokens, just tests auth/network.
            await openai.models.list();

            return NextResponse.json({
                status: 'healthy',
                provider: 'openai',
                message: 'OpenAI service is responsive'
            });

        } else if (provider === 'anthropic') {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                return NextResponse.json({
                    status: 'degraded',
                    provider: 'anthropic',
                    message: 'Missing ANTHROPIC_API_KEY'
                }, { status: 503 });
            }

            const anthropic = new Anthropic({ apiKey });
            // Lightweight ping: Fetching a single fast completion to test network/auth
            await anthropic.messages.create({
                model: 'claude-4.6-haiku-latest',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hello' }]
            });

            return NextResponse.json({
                status: 'healthy',
                provider: 'anthropic',
                message: 'Anthropic service is responsive'
            });

        } else {
            // HuggingFace / DeepSeek checking
            const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN;
            if (!hfToken) {
                return NextResponse.json({
                    status: 'degraded',
                    provider,
                    message: `Missing HF_TOKEN for ${provider}`
                }, { status: 503 });
            }

            const hf = new HfInference(hfToken);

            // Lightweight ping for HF network
            // Using a tiny chat completion request to validate auth instead of raw .request
            await hf.chatCompletion({
                model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
                messages: [{ role: 'user', content: 'hello' }],
                max_tokens: 1
            });

            return NextResponse.json({
                status: 'healthy',
                provider,
                message: `${provider} service via HuggingFace is responsive`
            });
        }

    } catch (error: any) {
        console.error('[AI Health Check] Failed:', error.message);

        // 401s, 429s, 500s all trigger degraded state
        let detailedMessage = 'Service is unreachable';
        if (error.status === 401 || error.message.includes('401')) {
            detailedMessage = 'Authentication failed. Check API key.';
        } else if (error.status === 429 || error.message.includes('429')) {
            detailedMessage = 'Rate limit exceeded.';
        }

        return NextResponse.json({
            status: 'degraded',
            message: detailedMessage
        }, { status: 503 });
    }
}
