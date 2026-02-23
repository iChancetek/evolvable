import { Agent, AgentInput, AgentOutput, AgentId } from '../types';
import { callLLM } from '../llm-adapter';

const SYSTEM_PROMPT = `
You are the Payment Integration Agent for the Evolvable platform — an elite FinTech Engineering AI.
You operate in EXECUTION MODE. Your job is to generate full payment integration code for ANY gateway the user requests (Stripe, PayPal, LemonSqueezy, Braintree, Razorpay, etc.).

You will receive the Project Blueprint containing the PRD, Implementation Plan, and Architecture.
Analyze the "monetizationModel" and the original user prompt from the PRD:
- If monetization is 'free' or 'none', DO NOT generate any payment code. Return an empty array.
- If it requires payment processing, identify the requested payment gateway. If none is specified, default to Stripe.

Rules for Payment Code Generation:
1. Use Next.js 15 App Router API Routes.
2. Generate a Checkout Session API Route (e.g., \`api/checkout/route.ts\`).
3. Generate a Webhook/IPN API Route for fulfillment (e.g., \`api/webhooks/payment/route.ts\`).
4. Generate a Frontend React Component for pricing or checkout buttons (e.g., \`components/PricingPlan.tsx\`).
5. Include detailed comments on required \`.env\` variables specific to the gateway (e.g., \`STRIPE_SECRET_KEY\`, \`LEMONSQUEEZY_API_KEY\`, \`PAYPAL_CLIENT_ID\`).
6. Assume standard Node SDKs for the chosen provider.

Expected Output JSON Format:
{
  "integrationRequired": boolean,
  "paymentProvider": string,
  "paymentCodeFiles": [
    {
      "path": string,
      "code": string
    }
  ],
  "requiredEnvVars": string[]
}
`;

export class PaymentIntegrationAgent implements Agent {
    id = AgentId.PAYMENT_INTEGRATION;
    name = 'Payment & Monetization Architect';

    async execute(input: AgentInput): Promise<AgentOutput> {
        try {
            // Guard clause: Only run if monetization demands it
            const monetization = input.blueprint.prd?.monetizationModel || 'none';
            if (monetization === 'free' || monetization === 'none') {
                return {
                    agentId: this.id,
                    status: 'completed',
                    payload: { integrationRequired: false, paymentProvider: 'none', paymentCodeFiles: [], requiredEnvVars: [] }
                };
            }

            const prompt = `
Analyze the following platform requirements and generate the required payment integration files.

Monetization Model: ${monetization}
Platform Mode: ${input.blueprint.prd?.platformMode}
App Title: ${input.blueprint.prd?.title}
Original User Prompt: ${input.blueprint.originalPrompt}

Instructions:
Identify the requested payment provider from the prompt (default to Stripe if vague).
Generate the Next.js API routes for Checkout and Webhooks, plus a frontend component to trigger the checkout.
Respond strictly with valid JSON matching the system prompt schema.
`;

            const parsedPayload = await callLLM<any>(SYSTEM_PROMPT, prompt, {
                provider: input.provider,
                jsonSchema: true
            });

            return {
                agentId: this.id,
                status: 'completed',
                payload: parsedPayload,
            };

        } catch (error: any) {
            return {
                agentId: this.id,
                status: 'failed',
                error: error.message,
                payload: null
            };
        }
    }
}
