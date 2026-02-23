import { ProjectBlueprint, AgentId } from './types';

/**
 * Fallback Generator Service for AI Resiliency Layer.
 * 
 * When the primary LLM provider fails (e.g., Missing API Key, 429 Rate Limit, 500 Outage), 
 * this service catches the user's intent and provides a graceful static fallback template
 * so the "vibe-coding" experience continues uninterrupted.
 */
export class FallbackGeneratorService {

    /**
     * Analyzes the prompt and returns a pre-configured template blueprint.
     */
    static generateFallbackBlueprint(prompt: string, blueprintBase: Partial<ProjectBlueprint>): ProjectBlueprint {
        const lowerPrompt = prompt.toLowerCase();

        let template = this.getGenericTemplate();

        if (lowerPrompt.includes('finance') || lowerPrompt.includes('dashboard') || lowerPrompt.includes('tracker')) {
            template = this.getFinancialDashboardTemplate();
        } else if (lowerPrompt.includes('shop') || lowerPrompt.includes('commerce') || lowerPrompt.includes('store')) {
            template = this.getECommerceTemplate();
        } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('content') || lowerPrompt.includes('article')) {
            template = this.getBlogTemplate();
        }

        // Merge the static template data with the dynamic IDs/metadata generated initially
        return {
            ...blueprintBase, // preserve IDs, timestamps, original prompt
            ...template,
            // Mark it specifically as a fallback so UI/Engine knows
            fallbackActive: true,
            phase: 'awaiting_approval',
            status: 'awaiting_approval',
            activePlanVersion: 1,
            planVersions: [{
                version: 1,
                generatedAt: Date.now(),
                agentIds: [AgentId.PLAN_COORDINATOR],
                plan: {
                    status: 'pending',
                    version: 1,
                    generatedAt: Date.now(),
                    executiveSummary: 'AI Service degraded. Fallback template loaded.',
                    architectureOverview: 'Standard Monolithic Next.js Setup',
                    phases: [],
                    riskAnalysis: 'Low - Pre-approved template',
                    timeline: 'Immediate',
                    requiredDependencies: [],
                    securityConsiderations: [],
                    deploymentStrategy: 'Standard Vercel deployment'
                }
            }]
        } as ProjectBlueprint;
    }

    private static getFinancialDashboardTemplate(): any {
        return {
            prd: {
                title: "Financial Tracking Dashboard",
                features: [
                    { id: 'f1', title: 'Auth & Onboarding', description: 'Secure login and account setup', required: true, phase: 'mvp' },
                    { id: 'f2', title: 'Overview Dashboard', description: 'Charts and high level KPI widgets', required: true, phase: 'mvp' },
                    { id: 'f3', title: 'Transaction Management', description: 'Log and edit income/expenses', required: true, phase: 'mvp' },
                    { id: 'f4', title: 'Monthly Reporting', description: 'Generate downloadable PDF reports', required: false, phase: 'growth' }
                ],
                platformMode: 'saas'
            },
            databaseSchema: {
                engine: "postgresql",
                tables: [
                    {
                        name: "users",
                        fields: { "id": "uuid", "email": "varchar", "subscription_tier": "varchar" },
                        indexes: ["email"],
                        tenantScoped: false
                    },
                    {
                        name: "transactions",
                        fields: {
                            "id": "uuid",
                            "user_id": "uuid",
                            "amount": "decimal",
                            "type": "varchar",
                            "category": "varchar",
                            "date": "timestamp"
                        },
                        indexes: ["user_id", "date"],
                        tenantScoped: true
                    }
                ]
            },
            architecture: {
                topology: "monolith",
                apiContracts: [
                    { method: "GET", path: "/api/transactions", description: "Fetch user transactions", auth: true, roles: ['user', 'admin'] },
                    { method: "POST", path: "/api/transactions", description: "Create new transaction", auth: true, roles: ['user', 'admin'] },
                    { method: "GET", path: "/api/analytics/summary", description: "Fetch KPI data for charts", auth: true, roles: ['user', 'admin'] }
                ]
            }
        };
    }

    private static getECommerceTemplate(): any {
        return {
            prd: {
                title: "Modern E-Commerce Storefront",
                features: [
                    { id: 'f1', title: 'Product Catalog', description: 'Grid of products with filtering', required: true, phase: 'mvp' },
                    { id: 'f2', title: 'Shopping Cart', description: 'Persistent state cart management', required: true, phase: 'mvp' },
                    { id: 'f3', title: 'Checkout Flow', description: 'Stripe integration for payments', required: true, phase: 'mvp' }
                ],
                platformMode: 'single_app'
            },
            databaseSchema: {
                engine: "postgresql",
                tables: [
                    {
                        name: "products",
                        fields: { "id": "uuid", "name": "varchar", "price": "decimal", "stock": "int" },
                        indexes: [],
                        tenantScoped: false
                    },
                    {
                        name: "orders",
                        fields: { "id": "uuid", "customer_email": "varchar", "total": "decimal", "status": "varchar" },
                        indexes: ["customer_email"],
                        tenantScoped: false
                    }
                ]
            },
            architecture: {
                topology: "monolith",
                apiContracts: [
                    { method: "GET", path: "/api/products", description: "Fetch catalog", auth: false, roles: [] },
                    { method: "POST", path: "/api/checkout", description: "Create Stripe session", auth: false, roles: [] }
                ]
            }
        };
    }

    private static getBlogTemplate(): any {
        return {
            prd: {
                title: "Content Publishing Platform",
                features: [
                    { id: 'f1', title: 'Article Feed', description: 'Chronological list of posts', required: true, phase: 'mvp' },
                    { id: 'f2', title: 'Markdown CMS', description: 'Admin area to write posts', required: true, phase: 'mvp' },
                    { id: 'f3', title: 'SEO Optimization', description: 'Dynamic meta tags and sitemap', required: false, phase: 'growth' }
                ],
                platformMode: 'single_app'
            },
            databaseSchema: {
                engine: "postgresql",
                tables: [
                    {
                        name: "posts",
                        fields: { "id": "uuid", "title": "varchar", "slug": "varchar", "content": "text", "published": "boolean" },
                        indexes: ["slug"],
                        tenantScoped: false
                    }
                ]
            },
            architecture: {
                topology: "monolith",
                apiContracts: [
                    { method: "GET", path: "/api/posts", description: "Fetch published posts", auth: false, roles: [] },
                    { method: "POST", path: "/api/admin/posts", description: "Create draft post", auth: true, roles: ['admin'] }
                ]
            }
        };
    }

    private static getGenericTemplate(): any {
        return {
            prd: {
                title: "Modern Web Application",
                features: [
                    { id: 'f1', title: 'User Authentication', description: 'Secure login system', required: true, phase: 'mvp' },
                    { id: 'f2', title: 'Core Application Logic', description: 'Main user routes and components', required: true, phase: 'mvp' },
                    { id: 'f3', title: 'Data Persistence', description: 'Database schema and models', required: true, phase: 'mvp' }
                ],
                platformMode: 'single_app'
            },
            databaseSchema: {
                engine: "postgresql",
                isolationStrategy: 'none',
                tables: [
                    {
                        name: "users",
                        fields: { "id": "uuid", "email": "varchar" },
                        indexes: ["email"],
                        tenantScoped: false
                    },
                    {
                        name: "items",
                        fields: { "id": "uuid", "name": "varchar" },
                        indexes: [],
                        tenantScoped: false
                    }
                ]
            },
            architecture: {
                topology: "monolith",
                apiContracts: [
                    { method: "GET", path: "/api/data", description: "Fetch core data", auth: true, roles: ['user'] }
                ]
            }
        };
    }
}
