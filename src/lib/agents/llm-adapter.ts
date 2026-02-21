import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';
import { LLMProvider } from './types';

// Initialize the Hugging Face client
const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN || '';
const hf = new HfInference(hfToken);

// Initialize the OpenAI client
const openaiKey = process.env.OPENAI_API_KEY || '';
const openai = new OpenAI({ apiKey: openaiKey });

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
    standard: 'gpt-5.2', // Migrated to gpt-5.2 per knowledge base
    reasoning: 'gpt-5.2',
    lightweight: 'gpt-4o-mini' // Fast fallback
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

    if (provider === 'openai') {
        const modelName = OPENAI_MODEL_ROUTING[workloadType] || 'gpt-5.2';

        while (attempt < MAX_RETRIES) {
            try {
                console.log(`[LLM Adapter] Calling OpenAI ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                const completionOptions: any = {
                    model: modelName,
                    messages: [
                        { role: "system", content: systemStr },
                        { role: "user", content: userPrompt }
                    ],
                    temperature,
                };

                // OpenAI GPT-5.2 specific logic mapping maxTokens to max_completion_tokens
                if (modelName === 'gpt-5.2') {
                    completionOptions.max_completion_tokens = maxTokens;
                } else {
                    completionOptions.max_tokens = maxTokens;
                }

                if (jsonSchema) {
                    completionOptions.response_format = { type: "json_object" };
                }

                const response = await openai.chat.completions.create(completionOptions);

                const content = response.choices[0]?.message?.content || "";

                if (jsonSchema) {
                    try {
                        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        return JSON.parse(cleanContent) as T;
                    } catch (parseError) {
                        console.error('[LLM Adapter] Failed to parse OpenAI JSON response:', content);
                        throw new Error(`Invalid JSON format retrieved from OpenAI: ${parseError}`);
                    }
                }

                return content as any;
            } catch (error: any) {
                attempt++;
                console.error(`[LLM Adapter] Error calling OpenAI ${modelName}:`, error.message);
                if (attempt >= MAX_RETRIES) throw new Error(`OpenAI call failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    } else if (provider === 'deepseek') {
        // DeepSeek V3.2 via HuggingFace Inference
        const modelName = DEEPSEEK_MODEL_ROUTING[workloadType];

        let payload: any = {
            model: modelName,
            messages: [
                { role: "system", content: systemStr },
                { role: "user", content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
        };

        if (jsonSchema) {
            payload.response_format = { type: "json_object" };
        }

        while (attempt < MAX_RETRIES) {
            try {
                console.log(`[LLM Adapter] Calling DeepSeek ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                const response = await hf.chatCompletion(payload);
                const content = response.choices[0]?.message?.content || "";

                if (jsonSchema) {
                    try {
                        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        return JSON.parse(cleanContent) as T;
                    } catch (parseError) {
                        console.error('[LLM Adapter] Failed to parse DeepSeek JSON response:', content);
                        throw new Error(`Invalid JSON format retrieved from DeepSeek: ${parseError}`);
                    }
                }

                return content as any;

            } catch (error: any) {
                attempt++;
                console.error(`[LLM Adapter] Error calling DeepSeek ${modelName}:`, error.message);
                if (attempt >= MAX_RETRIES) throw new Error(`DeepSeek call failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    } else {
        // HuggingFace Routing (Qwen)
        const modelName = HF_MODEL_ROUTING[workloadType];

        let payload: any = {
            model: modelName,
            messages: [
                { role: "system", content: systemStr },
                { role: "user", content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
        };

        if (jsonSchema) {
            payload.response_format = { type: "json_object" };
        }

        while (attempt < MAX_RETRIES) {
            try {
                console.log(`[LLM Adapter] Calling HF ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

                const response = await hf.chatCompletion(payload);
                const content = response.choices[0]?.message?.content || "";

                if (jsonSchema) {
                    try {
                        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        return JSON.parse(cleanContent) as T;
                    } catch (parseError) {
                        console.error('[LLM Adapter] Failed to parse HF JSON response:', content);
                        throw new Error(`Invalid JSON format retrieved from HF: ${parseError}`);
                    }
                }

                return content as any;

            } catch (error: any) {
                attempt++;
                console.error(`[LLM Adapter] Error calling HF ${modelName}:`, error.message);
                if (attempt >= MAX_RETRIES) throw new Error(`HF call failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    throw new Error('Unexpected adapter failure');
}
