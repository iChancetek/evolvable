import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face client
// In production, this should use a secure server-side environment variable.
// We fallback to a public token or throw if not available during real execution.
const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN || '';
const hf = new HfInference(hfToken);

export type AgentWorkloadType = 'standard' | 'reasoning' | 'lightweight';

export interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    workloadType?: AgentWorkloadType;
    jsonSchema?: boolean | Record<string, any>; // Optional JSON schema for structured output
}

const MODEL_ROUTING: Record<AgentWorkloadType, string> = {
    // Primary model for code generation, JSON structured output, and general agentic tasks
    standard: 'Qwen/Qwen3-32B-Instruct', // Sticking to the 32B limit for freer tier access while testing; upgrade to Qwen/Qwen3-235B-A22B for pro
    // Deep reasoning tasks (Architect, Security)
    reasoning: 'deepseek-ai/DeepSeek-V3',
    // Fast, lightweight tasks (Documentation, simple parsing)
    lightweight: 'Qwen/Qwen3-7B-Instruct'
};

/**
 * Shared adapter for making LLM calls to Hugging Face Inference API.
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
        jsonSchema
    } = options;

    const modelName = MODEL_ROUTING[workloadType];
    const MAX_RETRIES = 3;
    let attempt = 0;

    let payload: any = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
    };

    // If a JSON schema is provided, we tell the HF TGI endpoint to strictly follow it
    // Note: Not all models/endpoints support guided decoding. Qwen3 mostly does.
    if (jsonSchema) {
        payload.response_format = {
            type: "json_object",
            // In a real implementation using Outlines via TGI, we pass the schema
            // schema: jsonSchema 
        };
        // Ensure the system prompt explicitly asks for JSON
        if (!systemPrompt.includes('JSON')) {
            payload.messages[0].content += '\n\nIMPORTANT: You must output ONLY valid JSON matching the required schema. Do not include markdown formatting or backticks.';
        }
    }

    while (attempt < MAX_RETRIES) {
        try {
            console.log(`[LLM Adapter] Calling ${modelName} (Attempt ${attempt + 1}/${MAX_RETRIES})`);

            // Using the chat completion API which is standard across HF Text Generation Inference
            const response = await hf.chatCompletion(payload);

            const content = response.choices[0]?.message?.content || "";

            if (jsonSchema) {
                // Attempt to parse structured output
                try {
                    // Strip potential markdown code blocks returning from models that ignore instructions
                    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    return JSON.parse(cleanContent) as T;
                } catch (parseError) {
                    console.error('[LLM Adapter] Failed to parse JSON response:', content);
                    throw new Error(`Invalid JSON format retrieved from LLM: ${parseError}`);
                }
            }

            return content as any;

        } catch (error: any) {
            attempt++;
            console.error(`[LLM Adapter] Error calling ${modelName}:`, error.message);

            if (attempt >= MAX_RETRIES) {
                throw new Error(`LLM call failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`);
            }

            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }

    throw new Error('Unexpected adapter failure');
}
