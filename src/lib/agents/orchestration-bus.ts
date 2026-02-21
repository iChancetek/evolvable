import {
    AgentId,
    AgentOutput,
    ProjectBlueprint,
    AgentInput
} from './types';
import { ADRLogger } from './adr-logger';
import { getAgent } from './agent-registry'; // We will build this next
import { adminDb, FieldValue } from '../firebase/admin';

export type PipelineEventCallback = (event: {
    agentId?: AgentId;
    status: 'running' | 'completed' | 'failed' | 'vetoed',
    message: string,
    payload?: any
}) => void;

/**
 * Orchestration Bus
 * 
 * Manages the execution lifecycle of the 11-agent pipeline.
 * Enforces dependencies, parallelism, and ADR logging.
 */
export class OrchestrationBus {
    private blueprint: ProjectBlueprint;
    private adrLogger: ADRLogger;
    private onEvent: PipelineEventCallback;

    constructor(
        initialBlueprint: ProjectBlueprint,
        onEvent: PipelineEventCallback = () => { }
    ) {
        this.blueprint = initialBlueprint;
        this.adrLogger = new ADRLogger(initialBlueprint.id);
        this.onEvent = onEvent;
    }

    /**
     * Entry point to start or resume the AI build pipeline.
     */
    async executePipeline(): Promise<ProjectBlueprint> {
        try {
            await this.updateStatus('building');
            this.emit('System', 'running', 'Orchestration pipeline initiated.');

            // Phase 1: Requirements (Vision Agent)
            if (!this.blueprint.prd) {
                await this.runSequential(AgentId.VISION, 'prd', 'Analyzing requirements and generating PRD...');
            }

            // Phase 2: Parallel Design & Data Schema
            if (!this.blueprint.designSystem || !this.blueprint.databaseSchema) {
                this.emit('System', 'running', 'Running UI Designer and DB Architect in parallel...');
                await Promise.all([
                    this.blueprint.designSystem ? Promise.resolve() : this.runAgent(AgentId.UI_DESIGNER, 'designSystem'),
                    this.blueprint.databaseSchema ? Promise.resolve() : this.runAgent(AgentId.DB_ARCHITECT, 'databaseSchema')
                ]);
            }

            // Phase 3: Architecture & Logic
            if (!this.blueprint.architecture) {
                await this.runSequential(AgentId.SYSTEM_ARCHITECT, 'architecture', 'Designing system architecture...');
            }
            if (!this.blueprint.workflows) {
                await this.runSequential(AgentId.LOGIC_BUILDER, 'workflows', 'Building automation logic and workflows...');
            }

            // Phase 4: Code Generation
            if (!this.blueprint.codebase) {
                await this.runSequential(AgentId.CODE_GENERATION, 'codebase', 'Writing source code...');
            }

            // Phase 5: Quality & Security Gates
            if (!this.blueprint.qualityReport) {
                await this.runSequential(AgentId.QA_TESTING, 'qualityReport', 'Running test suite and quality checks...');
            }
            if (!this.blueprint.securityReport) {
                const secOutput = await this.runSequential(AgentId.SECURITY, 'securityReport', 'Performing SAST and vulnerability scan...');
                // Security has veto power
                if (!secOutput.payload.passed) {
                    this.emit(AgentId.SECURITY, 'vetoed', 'Security Gate Failed. Halting pipeline for fix.');
                    throw new Error('Security Veto');
                }
            }

            // Phase 6: Optimization & Deployment
            if (!this.blueprint.deploymentManifest) { // We skip debug_optimize flag here and just run it if needed
                await this.runSequential(AgentId.DEBUG_OPTIMIZE, null, 'Optimizing performance and resolving minor defects...');
                await this.runSequential(AgentId.DEPLOYMENT, 'deploymentManifest', 'Preparing deployment configuration...');
            }

            // Phase 7: Documentation
            await this.runSequential(AgentId.DOCUMENTATION, null, 'Generating final documentation and changelog...');

            await this.updateStatus('deployed', 'completed');
            this.emit('System', 'completed', 'Evolvable Pipeline Complete! App is ready.');

            return this.blueprint;

        } catch (error: any) {
            console.error('[Orchestrator] Pipeline failed:', error);
            await this.updateStatus('error');
            this.emit('System', 'failed', `Pipeline halted: ${error.message}`);
            throw error;
        }
    }

    private async runSequential(
        agentId: AgentId,
        blueprintKey: keyof ProjectBlueprint | null,
        message: string
    ): Promise<AgentOutput> {
        this.emit(agentId, 'running', message);
        const output = await this.runAgent(agentId, blueprintKey);
        this.emit(agentId, 'completed', `${agentId} completed successfully.`, output.payload);
        return output;
    }

    private async runAgent(agentId: AgentId, blueprintKey: keyof ProjectBlueprint | null): Promise<AgentOutput> {
        const agent = getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found in registry.`);

        console.log(`[Orchestrator] Starting ${agentId}...`);

        const input: AgentInput = {
            projectId: this.blueprint.id,
            payload: this.blueprint.originalPrompt, // Many agents will primarily just look at the accumulated blueprint
            blueprint: this.blueprint
        };

        const output = await agent.execute(input);

        if (output.status === 'failed') {
            throw new Error(`${agentId} failed: ${output.error}`);
        }

        // Apply result to blueprint if applicable
        if (blueprintKey && output.payload) {
            (this.blueprint as any)[blueprintKey] = output.payload;
        }

        // Save progress to database
        await this.saveBlueprintProgress(agentId);

        console.log(`[Orchestrator] Finished ${agentId}.`);
        return output;
    }

    private emit(agentId: AgentId | 'System', status: 'running' | 'completed' | 'failed' | 'vetoed', message: string, payload?: any) {
        try {
            const logEntry = {
                timestamp: Date.now(),
                agentId: agentId !== 'System' ? agentId : 'system',
                status,
                message
            };
            const ref = adminDb.collection('projects').doc(this.blueprint.id);
            ref.update({
                pipelineLogs: FieldValue.arrayUnion(logEntry)
            }).catch(e => console.warn('[Log Stream] Non-fatal error:', e));
        } catch (e) {
            console.error('[Log Stream] Setup error:', e);
        }

        this.onEvent({
            agentId: agentId !== 'System' ? agentId as AgentId : undefined,
            status,
            message,
            payload
        });
    }

    private async updateStatus(status: ProjectBlueprint['status'], phase?: ProjectBlueprint['currentPhase']) {
        this.blueprint.status = status;
        if (phase) this.blueprint.currentPhase = phase;

        const ref = adminDb.collection('projects').doc(this.blueprint.id);
        await ref.update({ status, currentPhase: this.blueprint.currentPhase });
    }

    private async saveBlueprintProgress(completedAgentId: AgentId) {
        this.blueprint.currentPhase = completedAgentId;
        const ref = adminDb.collection('projects').doc(this.blueprint.id);
        await ref.set(this.blueprint, { merge: true });
    }
}
