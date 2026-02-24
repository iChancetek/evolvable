import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './types';

// Remove static top-level instance to ensure fresh env variables are read per invocation
// and to avoid crashing/caching an empty key on server boot if .env is loaded late.

// --- Circuit Breaker Singleton ---
class AICircuitBreaker {
    private failureCount = 0;
    private lastFailureTime = 0;
    private readonly FAILURE_THRESHOLD = 3;
    private readonly RESET_TIMEOUT_MS = 60000; // 1 minute before trying again

    isOpen(): boolean {
        if (this.failureCount >= this.FAILURE_THRESHOLD) {
            const now = Date.now();
            if (now - this.lastFailureTime > this.RESET_TIMEOUT_MS) {
                // Half-open: let one request through to test the waters
                this.failureCount = this.FAILURE_THRESHOLD - 1;
                return false;
            }
            return true;
        }
        return false;
    }

    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.FAILURE_THRESHOLD) {
            console.warn(`[Circuit Breaker] OPENED! AI services have failed ${this.failureCount} times consecutively. Switching to Fallback Mode.`);
        }
    }

    recordSuccess() {
        if (this.failureCount > 0) {
            console.log(`[Circuit Breaker] CLOSED. AI services recovered.`);
            this.failureCount = 0;
        }
    }
}

const circuitBreaker = new AICircuitBreaker();
// ---------------------------------

export type AgentWorkloadType = 'standard' | 'reasoning' | 'lightweight';

export interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    workloadType?: AgentWorkloadType;
    jsonSchema?: boolean | Record<string, any>; // Optional JSON schema for structured output
    provider?: LLMProvider;
}

const HF_MODEL_ROUTING: Record<AgentWorkloadType, string> = {
    // Primary model for code generation, JSON structured output, and general agentic tasks
    standard: 'Qwen/Qwen3-32B-Instruct', // downgrade to 32B for free tier testing
    // Deep reasoning tasks (Architect, Security)
    reasoning: 'deepseek-ai/DeepSeek-V3',
    // Fast, lightweight tasks (Documentation, simple parsing)
    lightweight: 'Qwen/Qwen3-7B-Instruct'
};

// DeepSeek V3.2 — latest model via HuggingFace Inference
const DEEPSEEK_MODEL_ROUTING: Record<AgentWorkloadType, string> = {
    standard: 'deepseek-ai/DeepSeek-V3.2',
    reasoning: 'deepseek-ai/DeepSeek-V3.2',
    lightweight: 'deepseek-ai/DeepSeek-V3.2'
};

const OPENAI_MODEL_ROUTING: Record<AgentWorkloadType, string> = {
    standard: 'gpt-4o',       // Fast, capable — used for most planning agents
    reasoning: 'gpt-5.2',     // Slow, deep — reserved for Architect/Security agents
    lightweight: 'gpt-4o-mini' // Fastest — documentation, simple parsing
};

const ANTHROPIC_MODEL_ROUTING: Record<AgentWorkloadType, string> = {
    standard: 'claude-4.6-sonnet-latest',
    reasoning: 'claude-4.6-sonnet-latest',
    lightweight: 'claude-4.6-haiku-latest'
};

/**
 * Shared adapter for making LLM calls to Hugging Face Inference API and OpenAI.
 * Includes built-in retry logic, token management, and structured output parsing.
 */
export async function callLLM<T = any>(
    systemPrompt: string,
    userPrompt: string,
    options: LLMOptions = {}
): Promise<T> {
    const {
        temperature = 0.2, // Low temp by default for deterministic agent output
        maxTokens = 4096,
        workloadType = 'standard',
        jsonSchema,
        provider = 'openai'
    } = options;

    const MAX_RETRIES = 3;
    let attempt = 0;

    let systemStr = systemPrompt;
    if (jsonSchema && !systemStr.includes('JSON')) {
        systemStr += '\n\nIMPORTANT: You must output ONLY valid JSON matching the required schema. Do not include markdown formatting or backticks.';
    }

    // 0. Circuit Breaker Check
    if (circuitBreaker.isOpen()) {
        throw new Error("AI Circuit Breaker is OPEN. Skipping LLM call to save latency and preserve fallback UX.");
    }

    // Provider Fallback Chain (Order of preference if primary fails)
    const PROVIDER_CHAIN: LLMProvider[] = [provider, 'openai', 'anthropic', 'deepseek'].filter((v, i, a) => a.indexOf(v) === i) as LLMProvider[];

    let lastError: any = null;

    for (const currentProvider of PROVIDER_CHAIN) {
        let attempt = 0;
        const MAX_RETRIES = 3;

        while (attempt < MAX_RETRIES) {
            try {
                if (currentProvider === 'openai') {
                    const modelName = OPENAI_MODEL_ROUTING[workloadType] || 'gpt-5.2';
                    console.log(`[LLM Adapter] Calling OpenAI ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                    const completionOptions: any = {
                        model: modelName,
                        messages: [
                            { role: "system", content: systemStr },
                            { role: "user", content: userPrompt }
                        ],
                        temperature,
                    };

                    if (modelName === 'gpt-5.2') completionOptions.max_completion_tokens = maxTokens;
                    else completionOptions.max_tokens = maxTokens;

                    if (jsonSchema) completionOptions.response_format = { type: "json_object" };

                    const openai = new OpenAI();
                    const response = await openai.chat.completions.create(completionOptions);
                    return parseResponse(response.choices[0]?.message?.content || "", jsonSchema);

                } else if (currentProvider === 'deepseek') {
                    const modelName = DEEPSEEK_MODEL_ROUTING[workloadType];
                    console.log(`[LLM Adapter] Calling DeepSeek ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                    let payload: any = {
                        model: modelName,
                        messages: [
                            { role: "system", content: systemStr },
                            { role: "user", content: userPrompt }
                        ],
                        temperature,
                        max_tokens: maxTokens,
                    };
                    if (jsonSchema) payload.response_format = { type: "json_object" };

                    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN;
                    if (!hfToken) throw new Error("Missing HF_TOKEN");
                    const hf = new HfInference(hfToken);
                    const response = await hf.chatCompletion(payload);
                    return parseResponse(response.choices[0]?.message?.content || "", jsonSchema);

                } else if (currentProvider === 'anthropic') {
                    const modelName = ANTHROPIC_MODEL_ROUTING[workloadType];
                    console.log(`[LLM Adapter] Calling Anthropic ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                    const anthropic = new Anthropic();
                    let sys = systemStr;
                    let u = userPrompt;
                    if (jsonSchema) {
                        sys += '\n\nOutput raw JSON only. Ensure the root is a JSON object `{...}`.';
                        u += '\n\n{';
                    }

                    const response = await anthropic.messages.create({
                        model: modelName,
                        max_tokens: maxTokens,
                        temperature,
                        system: sys,
                        messages: [{ role: 'user', content: u }]
                    });

                    let content = (response.content[0] as any).text;
                    if (jsonSchema && !content.trim().startsWith('{')) content = '{' + content;
                    return parseResponse(content, jsonSchema);

                } else if (currentProvider === 'huggingface') {
                    const modelName = HF_MODEL_ROUTING[workloadType];
                    console.log(`[LLM Adapter] Calling HuggingFace ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN;
                    if (!hfToken) throw new Error("Missing HF_TOKEN");
                    const hf = new HfInference(hfToken);

                    const payload: any = {
                        model: modelName,
                        messages: [
                            { role: "system", content: systemStr },
                            { role: "user", content: userPrompt }
                        ],
                        temperature,
                        max_tokens: maxTokens,
                    };
                    if (jsonSchema) payload.response_format = { type: "json_object" };

                    const response = await hf.chatCompletion(payload);
                    return parseResponse(response.choices[0]?.message?.content || "", jsonSchema);
                }
            } catch (error: any) {
                attempt++;
                lastError = error;
                console.error(`[LLM Adapter] Error calling ${currentProvider}:`, error.message);

                const isAuthError = error.status === 401 || error.message.includes('401') || error.message.includes('API key') || error.message.includes('Missing HF_TOKEN');

                // If it's an auth error or we've exhausted retries, break inner loop to failover to next provider
                if (isAuthError || attempt >= MAX_RETRIES) {
                    console.warn(`[LLM Adapter] Provider ${currentProvider} exhausted/failed with auth error. Failing over...`);
                    break;
                }

                // Exponential backoff before intra-provider retry
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    // If we escape the provider loop, all fallbacks failed
    circuitBreaker.recordFailure();
    throw new Error(`All LLM providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// ----------------------------------------------------
// Helper Function 
// ----------------------------------------------------
function parseResponse<T>(content: string, jsonSchema: any): T {
    if (jsonSchema) {
        try {
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            circuitBreaker.recordSuccess();
            return JSON.parse(cleanContent) as T;
        } catch (parseError) {
            console.error('[LLM Adapter] Failed to parse JSON response:', content);
            throw new Error(`Invalid JSON format retrieved: ${parseError}`);
        }
    }

    circuitBreaker.recordSuccess();
    return content as any;
}
