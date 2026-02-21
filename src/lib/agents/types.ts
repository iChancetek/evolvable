export enum AgentId {
    VISION = 'vision',
    SYSTEM_ARCHITECT = 'system_architect',
    UI_DESIGNER = 'ui_designer',
    DB_ARCHITECT = 'db_architect',
    CODE_GENERATION = 'code_generation',
    LOGIC_BUILDER = 'logic_builder',
    QA_TESTING = 'qa_testing',
    DEBUG_OPTIMIZE = 'debug_optimize',
    SECURITY = 'security',
    DEPLOYMENT = 'deployment',
    DOCUMENTATION = 'documentation'
}

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'vetoed';

export interface AgentInput {
    projectId: string;
    payload: any;
    blueprint: ProjectBlueprint; // Current accumulated state of the project
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

// Immutable log of architectural decisions
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

// Global state accumulated as pipeline progresses
export interface ProjectBlueprint {
    id: string;
    userId: string;
    originalPrompt: string;
    createdAt: number;

    // Agent Outputs
    prd?: ProductRequirementsDocument;
    designSystem?: DesignSystemSpec;
    databaseSchema?: DatabaseSchema;
    architecture?: ArchitectureDesignDocument;
    workflows?: WorkflowManifest;
    codebase?: GeneratedCodebase;
    qualityReport?: QualityReport;
    securityReport?: SecurityAuditReport;
    deploymentManifest?: DeploymentManifest;

    adrLog: ADREntry[];
    currentPhase: AgentId | 'completed';
    status: 'draft' | 'building' | 'deployed' | 'error';
}

// ---------------------------------------------------------
// Specific Agent Output Types (Stubs for now)
// ---------------------------------------------------------

export interface ProductRequirementsDocument {
    title: string;
    description: string;
    targetUsers: string[];
    features: { id: string; title: string; required: boolean }[];
    userFlows: string[];
    pageInventory: { path: string; purpose: string }[];
    dataEntities: { name: string; fields: string[] }[];
}

export interface DesignSystemSpec {
    colors: Record<string, string>;
    typography: Record<string, string>;
    components: string[];
}

export interface DatabaseSchema {
    engine: 'postgresql' | 'mongodb' | 'firestore' | 'redis';
    tables: any[];
}

export interface ArchitectureDesignDocument {
    topology: 'monolith' | 'microservices' | 'serverless';
    stack: {
        frontend: string;
        backend: string;
        database: string;
        hosting: string;
    };
    apiContracts: any[];
}

export interface WorkflowManifest {
    automations: any[];
}

export interface GeneratedCodebase {
    files: Record<string, string>; // path -> content
    dependencies: Record<string, string>;
}

export interface QualityReport {
    passed: boolean;
    coverage: number;
    testResults: any[];
}

export interface SecurityAuditReport {
    passed: boolean;
    criticalVulnerabilities: number;
    findings: any[];
}

export interface DeploymentManifest {
    provider: string;
    liveUrl: string;
    resources: any[];
}
