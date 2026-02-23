// ================================================================
// Evolvable Agent System — Types
// Platform Generation + Plan-First Execution Model
// ================================================================

export enum AgentId {
    VISION = 'vision',
    SYSTEM_ARCHITECT = 'system_architect',
    PLAN_COORDINATOR = 'plan_coordinator',
    UI_DESIGNER = 'ui_designer',
    DB_ARCHITECT = 'db_architect',
    BACKEND_GENERATION = 'backend_generation',
    CODE_GENERATION = 'code_generation',
    LOGIC_BUILDER = 'logic_builder',
    QA_TESTING = 'qa_testing',
    DEBUG_OPTIMIZE = 'debug_optimize',
    SECURITY = 'security',
    DEPLOYMENT = 'deployment',
    DOCUMENTATION = 'documentation',
    // NLP Infrastructure Setup
    NLII = 'nlii',
    NLDI = 'nldi',
    INFRA_TERRAFORM = 'infra_terraform',
    INFRA_DOCKER = 'infra_docker',
    INFRA_SCRIPT = 'infra_script'
}

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'vetoed';

export type LLMProvider = 'huggingface' | 'openai' | 'deepseek';

// ---------------------------------------------------------
// Platform Intelligence
// ---------------------------------------------------------

export type PlatformMode =
    | 'single_app'
    | 'saas'
    | 'marketplace'
    | 'social'
    | 'enterprise_dashboard'
    | 'api_platform'
    | 'multi_tenant';

export type MonetizationModel = 'free' | 'freemium' | 'subscription' | 'usage_based' | 'marketplace_fee' | 'none';

export type TenantIsolationStrategy = 'schema_per_tenant' | 'row_level' | 'shared' | 'none';

export type PipelinePhase =
    | 'planning'
    | 'awaiting_clarification' // NLII needs more details before planning
    | 'awaiting_approval'
    | 'executing'
    | 'completed'
    | 'error';

export type PlanStatus =
    | 'draft'
    | 'awaiting_clarification'
    | 'awaiting_approval'
    | 'approved'
    | 'revision_requested'
    | 'cancelled';

// ---------------------------------------------------------
// RBAC & Security
// ---------------------------------------------------------

export interface UserRole {
    name: string;
    description: string;
    permissions: string[];
}

export interface RBACPolicy {
    roles: UserRole[];
    routeMap: Record<string, string[]>; // route → allowed roles[]
    tenantScoped: boolean;
}

// ---------------------------------------------------------
// Implementation Plan (9 mandatory sections)
// ---------------------------------------------------------

export interface ImplementationPlan {
    version: number;
    generatedAt: number;
    agentIds: AgentId[];
    status: PlanStatus;

    executiveSummary: {
        appType: PlatformMode;
        targetUsers: string[];
        coreFeatures: string[];
        estimatedComplexity: 'low' | 'medium' | 'high' | 'enterprise';
        estimatedBuildTime: string;
        monetizationModel: MonetizationModel;
    };

    architectureOverview: {
        frontend: string;
        backend: string;
        database: string;
        auth: string;
        hosting: string;
        topology: 'monolith' | 'microservices' | 'serverless';
        multiTenantStrategy?: TenantIsolationStrategy;
    };

    featureBreakdown: {
        pages: { path: string; purpose: string; roles: string[] }[];
        components: { name: string; purpose: string }[];
        apis: { method: string; path: string; description: string; auth: boolean; roles: string[] }[];
        workflows: string[];
        userRoles: string[];
        permissions: Record<string, string[]>;
    };

    databaseDesign: {
        engine: string;
        models: { name: string; fields: Record<string, string>; tenantScoped: boolean }[];
        relationships: string[];
        indexStrategy: string[];
        isolationLogic?: string;
    };

    securityPlan: {
        authFlow: string;
        authorizationLogic: string;
        roleMapping: Record<string, string[]>;
        routeProtection: string[];
        rateLimiting: string;
        inputValidation: string;
        firestoreRules?: string;
    };

    deploymentStrategy: {
        hosting: string;
        envVars: string[];
        domainSetup: string;
        scalingModel: string;
        rollbackStrategy: string;
        healthChecks: string[];
    };

    testingPlan: {
        unitScope: string[];
        integrationScope: string[];
        authFlowTests: string[];
        securityTests: string[];
        rbacMatrix: { role: string; route: string; allowed: boolean }[];
    };

    nliiSummary?: NLIISummary;
    nldiSummary?: NLDISummary;
    infrastructureBlueprint?: InfrastructureBlueprint;

    monitoringPlan: {
        metrics: string[];
        errorLogging: string;
        authAnalytics: string;
        performanceTracking: string;
    };

    riskAnalysis: {
        technicalRisks: { risk: string; severity: 'low' | 'medium' | 'high'; mitigation: string }[];
        securityRisks: { risk: string; severity: 'low' | 'medium' | 'high'; mitigation: string }[];
        scalabilityRisks: { risk: string; severity: 'low' | 'medium' | 'high'; mitigation: string }[];
    };

    selfValidation: {
        architectureCrossReviewed: boolean;
        scalabilityValidated: boolean;
        securityValidated: boolean;
        multiTenantIntegrityChecked: boolean;
        feasibilityConfirmed: boolean;
    };
}

export interface PlanVersion {
    version: number;
    plan: ImplementationPlan;
    generatedAt: number;
    approvedAt?: number;
    approvedByUserId?: string;
    revisionNotes?: string;
    agentIds: AgentId[];
}

// ---------------------------------------------------------
// Testing & Monitoring
// ---------------------------------------------------------

export interface TestSuite {
    passed: boolean;
    coverage: number;
    unit: { name: string; passed: boolean; description: string }[];
    integration: { name: string; passed: boolean; endpoint: string }[];
    authFlows: { scenario: string; passed: boolean }[];
    rbacMatrix: { role: string; route: string; allowed: boolean; tested: boolean }[];
    edgeCases: { scenario: string; passed: boolean }[];
}

export interface MonitoringConfig {
    metrics: string[];
    errorReporting: string;
    authActivityTracking: boolean;
    performanceMonitoring: boolean;
    dashboardUrl?: string;
}

// ---------------------------------------------------------
// Visual Builder JSON AST Types
// ---------------------------------------------------------

export type ComponentType =
    | 'hero'
    | 'text'
    | 'button'
    | 'form'
    | 'image'
    | 'features'
    | 'navbar'
    | 'footer'
    | 'card'
    | 'columns'
    | 'divider';

export interface CanvasProp {
    content?: string;
    bgColor?: string;
    textColor?: string;
    padding?: number;
    borderRadius?: number;
    href?: string;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    [key: string]: any;
}

export interface CanvasNode {
    id: string;
    type: ComponentType;
    props: CanvasProp;
    pageId: string;
}

export interface CanvasPage {
    id: string;
    path: string;
    title: string;
    nodes: CanvasNode[];
}

export interface VisualLayout {
    pages: CanvasPage[];
    activePage: string;
    version: number;
}

// ---------------------------------------------------------
// Agent I/O
// ---------------------------------------------------------

export interface AgentInput {
    projectId: string;
    payload: any;
    blueprint: ProjectBlueprint;
    provider?: LLMProvider;
    planningMode?: boolean; // When true, agents must not generate code/infra/deploy calls
}

export interface AgentOutput {
    agentId: AgentId;
    status: AgentStatus;
    payload: any;
    error?: string;
}

export interface Agent {
    id: AgentId;
    execute(input: AgentInput): Promise<AgentOutput>;
}

// ---------------------------------------------------------
// ADR & Audit
// ---------------------------------------------------------

export interface ADREntry {
    id: string;
    timestamp: number;
    agentId: AgentId;
    decision: string;
    rationale: string;
    alternativesConsidered?: string[];
    tradeOffs?: string;
    status: 'accepted' | 'superseded' | 'deprecated';
}

export type AuditEventType =
    | 'plan_generated'
    | 'plan_revision_requested'
    | 'plan_approved'
    | 'plan_cancelled'
    | 'execution_started'
    | 'plan_drift'
    | 'security_veto'
    | 'qa_gate_failed'
    | 'deployed'
    // GitHub integration events
    | 'github_account_linked'
    | 'github_account_unlinked'
    | 'github_repo_created'
    | 'github_branch_created'
    | 'github_committed'
    | 'github_pr_opened'
    | 'pr_merged'
    | 'rollback_initiated'
    // Infra generation events
    | 'nl_interpretation_complete'
    | 'nldi_interpretation_complete'
    | 'infra_clarification_requested'
    | 'infra_clarified'
    | 'infra_generated'
    // Domain & Hosting events
    | 'domain_purchase_failed'
    | 'domain_connected'
    | 'ssl_provisioned'
    | 'deployment_failed';

export interface AuditLogEntry {
    id: string;
    event: AuditEventType;
    timestamp: number;
    projectId: string;
    userId?: string;
    planVersion?: number;
    agentId?: string;
    description: string;
    metadata?: Record<string, any>;
}

// ---------------------------------------------------------
// ProjectBlueprint — Global state accumulated as pipeline progresses
// ---------------------------------------------------------

export interface ProjectBlueprint {
    id: string; // Document ID in 'projects' collection
    userId: string;
    originalPrompt: string;
    createdAt: number;

    // Master state machine
    status: 'draft' | 'awaiting_clarification' | 'awaiting_approval' | 'building' | 'deployed' | 'error';
    phase: PipelinePhase;
    planVersions: PlanVersion[];
    activePlanVersion: number;
    platformMode?: PlatformMode;
    rbacPolicy?: RBACPolicy;

    // Agent outputs — Planning Phase
    prd?: ProductRequirementsDocument;
    designSystem?: DesignSystemSpec;
    databaseSchema?: DatabaseSchema;
    architecture?: ArchitectureDesignDocument;
    infrastructure?: InfrastructureBlueprint;
    nldiSummary?: NLDISummary;

    // Agent outputs — Execution Phase
    workflows?: WorkflowManifest;
    codebase?: GeneratedCodebase;
    backendRoutes?: GeneratedBackendRoutes;
    infraTerraform?: GeneratedCodebase;
    infraDocker?: GeneratedCodebase;
    infraScript?: GeneratedCodebase;
    qualityReport?: TestSuite;
    securityReport?: SecurityAuditReport;
    deploymentManifest?: DeploymentManifest;
    monitoringConfig?: MonitoringConfig;

    // GitHub version control state (populated after code generation)
    github?: {
        repoFullName: string;       // "username/repo-name"
        repoUrl: string;
        currentBranch: string;      // "feature/plan-v2"
        mainBranch: string;         // "main"
        latestCommitSha?: string;
        openPrNumber?: number;
        openPrUrl?: string;
        mergedAt?: number;          // set when PR merged — unlocks deployment
    };

    adrLog: ADREntry[];
    pipelineLogs?: PipelineLog[];
    llmProvider: LLMProvider;
    currentPhase: AgentId | 'completed';
    visualLayout?: VisualLayout;
}

export interface PipelineLog {
    timestamp: number;
    agentId?: string;
    status: string;
    message: string;
}

// ---------------------------------------------------------
// Specific Agent Output Types
// ---------------------------------------------------------

export interface ProductRequirementsDocument {
    title: string;
    description: string;
    platformMode: PlatformMode;
    targetUsers: string[];
    userRoles: string[];
    monetizationModel: MonetizationModel;
    features: { id: string; title: string; description: string; required: boolean; phase: 'mvp' | 'growth' | 'scale' }[];
    userFlows: string[];
    pageInventory: { path: string; purpose: string; roles: string[] }[];
    dataEntities: { name: string; fields: string[]; tenantScoped: boolean }[];
    roadmap: { phase: string; features: string[] }[];
}

export interface DesignSystemSpec {
    colors: Record<string, string>;
    typography: Record<string, string>;
    components: string[];
}

export interface DatabaseSchema {
    engine: 'postgresql' | 'mongodb' | 'firestore' | 'redis';
    tables: {
        name: string;
        fields: Record<string, string>;
        indexes: string[];
        tenantScoped: boolean;
    }[];
    isolationStrategy: TenantIsolationStrategy;
    firestoreRules?: string;
    queryPatterns?: string[];
}

export interface ArchitectureDesignDocument {
    topology: 'monolith' | 'microservices' | 'serverless';
    platformMode: PlatformMode;
    stack: {
        frontend: string;
        backend: string;
        database: string;
        hosting: string;
    };
    apiContracts: {
        method: string;
        path: string;
        description: string;
        auth: boolean;
        roles: string[];
        requestSchema?: string;
        responseSchema?: string;
    }[];
    tenantIsolation: TenantIsolationStrategy;
    rbacPolicy: RBACPolicy;
    serviceBoundaries?: string[];
}

export interface WorkflowManifest {
    automations: { name: string; trigger: string; actions: string[] }[];
}

export interface GeneratedCodebase {
    files: Record<string, string>; // path → content
    dependencies: Record<string, string>;
}

export interface GeneratedBackendRoutes {
    routes: {
        path: string;
        method: string;
        auth: boolean;
        roles: string[];
        code: string;
    }[];
}

export interface SecurityAuditReport {
    passed: boolean;
    criticalVulnerabilities: number;
    findings: {
        severity: 'critical' | 'high' | 'medium' | 'low';
        type: string;
        description: string;
        location?: string;
        remediation: string;
    }[];
    attackSimulations: {
        scenario: string;
        passed: boolean;
        details: string;
    }[];
    driftFromPlan: boolean;
}

export interface DeploymentManifest {
    provider: string;
    liveUrl: string;
    resources: any[];
    envVars: string[];
    healthCheckEndpoints: string[];
    scalingRules: string;
    rollbackProcedure: string;
}

// ---------------------------------------------------------
// Infrastructure blueprints (Generated by NLII & NLDI)
// ---------------------------------------------------------

export interface NLDISummary {
    provider: 'vercel' | 'heroku' | 'azure' | 'aws' | 'recommend';
    domainIntent: 'buy' | 'connect' | 'subdomain';
    domainName?: string;
    scaling: string; // e.g. "Auto-scaling up to 10,000 users/day"
    budget: string; // e.g. "Low cost, startup friendly"
    region: string; // e.g. "US East (N. Virginia)"
    sslStatus: 'auto_provisioned';
    clarificationsNeeded?: string[]; // If present, system pauses similarly to NLII
}

export interface NLIISummary {
    interpretedIntent: string;
    identifiedCloud: 'aws' | 'gcp' | 'azure' | 'digitalocean' | 'vercel' | 'on_prem' | 'unknown';
    identifiedOS: 'linux' | 'windows' | 'agnostic';
    identifiedTooling: string[]; // e.g. ["terraform", "docker", "bash"]
    assumptionsMade: string[];
    clarificationsNeeded?: string[]; // If present, system pauses for user input
    estimatedCostTier: 'free' | 'startup_low' | 'growth_mid' | 'enterprise_high';
    riskLevel: 'low' | 'medium' | 'high';
}

export interface InfrastructureBlueprint {
    nliiSummary: NLIISummary;
    networking: {
        publicExposure: boolean;
        loadBalancingRequired: boolean;
        vpcStructure?: string;
    };
    compute: {
        type: 'serverless' | 'container' | 'vm' | 'static';
        scaling: 'static' | 'auto';
        instanceCount?: number;
    };
    security: {
        encryptionRequired: boolean;
        complianceWants?: string[];
        allowedPorts: number[];
    };
    artifactsRequired: {
        terraform: boolean;
        docker: boolean;
        bash: boolean;
        powershell: boolean;
    };
}
