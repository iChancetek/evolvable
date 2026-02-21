import {
    AgentId,
    AgentOutput,
    ProjectBlueprint,
    AgentInput
} from './types';
import { ADRLogger } from './adr-logger';
import { getAgent } from './agent-registry';
import { adminDb, FieldValue } from '../firebase/admin';
import { AuditLogger } from '../audit/audit-logger';
import { GitHubTokenService } from '../github/github-token-service';
import { GitHubIntegrationService } from '../github/github-service';

export type PipelineEventCallback = (event: {
    agentId?: AgentId;
    status: 'running' | 'completed' | 'failed' | 'vetoed',
    message: string,
    payload?: any
}) => void;

/**
 * OrchestrationBus — Two-Phase Pipeline Manager
 *
 * Phase 1 (Planning): Vision → DB Architect + UI Designer → System Architect → Plan Coordinator
 *   → Sets project to 'awaiting_approval' and RETURNS. No code runs past this point.
 *
 * Phase 2 (Execution): Only runs after explicit user approval is written to Firestore.
 *   Backend Generation → Code Generation → Security (VETO) → QA (GATE) → Optimize → Deploy → Docs
 */
export class OrchestrationBus {
    private blueprint: ProjectBlueprint;
    private adrLogger: ADRLogger;
    private auditLogger: AuditLogger;
    private onEvent: PipelineEventCallback;

    constructor(
        initialBlueprint: ProjectBlueprint,
        onEvent: PipelineEventCallback = () => { }
    ) {
        this.blueprint = initialBlueprint;
        this.adrLogger = new ADRLogger(initialBlueprint.id);
        this.auditLogger = new AuditLogger(initialBlueprint.id);
        this.onEvent = onEvent;
    }

    // ================================================================
    // PHASE 1 — PLANNING (no code, no infra, no deploy)
    // ================================================================
    async executePlanningPhase(): Promise<ProjectBlueprint> {
        try {
            await this.updatePhase('planning', 'building');
            this.emit('System', 'running', '🧠 Planning Phase started. Analyzing your idea...');

            // Step 1: Vision Agent — platform mode + PRD
            if (!this.blueprint.prd) {
                await this.runSequential(AgentId.VISION, 'prd', '🔍 Vision Agent: Classifying platform type and generating PRD...', true);
            }

            // Step 2: Parallel — UI Designer + DB Architect
            if (!this.blueprint.designSystem || !this.blueprint.databaseSchema) {
                this.emit('System', 'running', '⚡ Running UI Designer and DB Architect in parallel...');
                await Promise.all([
                    this.blueprint.designSystem ? Promise.resolve() : this.runAgent(AgentId.UI_DESIGNER, 'designSystem', true),
                    this.blueprint.databaseSchema ? Promise.resolve() : this.runAgent(AgentId.DB_ARCHITECT, 'databaseSchema', true)
                ]);
            }

            // Step 3: System Architect — generates ImplementationPlan
            let archOutput: AgentOutput | null = null;
            if (!this.blueprint.architecture) {
                archOutput = await this.runSequential(AgentId.SYSTEM_ARCHITECT, null, '🏗️ System Architect: Designing architecture and building implementation plan...', true);
                // Architecture and plan come back together
                if (archOutput?.payload?.architecture) {
                    this.blueprint.architecture = archOutput.payload.architecture;
                }
            }

            // Step 4: Plan Coordinator — persists plan, sets awaiting_approval, PAUSES BUS
            this.emit('System', 'running', '📋 Plan Coordinator: Finalizing and presenting implementation plan...');
            const planInput: AgentInput = {
                projectId: this.blueprint.id,
                payload: archOutput?.payload || { implementationPlan: null },
                blueprint: this.blueprint,
                provider: this.blueprint.llmProvider,
                planningMode: true
            };

            const planAgent = getAgent(AgentId.PLAN_COORDINATOR);
            if (!planAgent) throw new Error('PlanCoordinator agent not found');
            const planOutput = await planAgent.execute(planInput);

            if (planOutput.status === 'failed') {
                throw new Error(`PlanCoordinator failed: ${planOutput.error}`);
            }

            await this.auditLogger.planGenerated(planOutput.payload?.planVersion || 1, [
                AgentId.VISION, AgentId.UI_DESIGNER, AgentId.DB_ARCHITECT, AgentId.SYSTEM_ARCHITECT, AgentId.PLAN_COORDINATOR
            ]);

            // Update blueprint planVersions from Firestore output
            if (planOutput.payload?.plan) {
                this.blueprint.planVersions = [...(this.blueprint.planVersions || []), {
                    version: planOutput.payload.planVersion,
                    plan: planOutput.payload.plan,
                    generatedAt: Date.now(),
                    agentIds: planOutput.payload.plan.agentIds
                }];
                this.blueprint.activePlanVersion = planOutput.payload.planVersion;
            }

            this.emit('System', 'completed', `✅ Implementation Plan v${planOutput.payload?.planVersion || 1} ready for your review. Execution is paused until you approve.`);

            // PAUSE — return here. Execution only resumes via /api/orchestrate/approve
            return this.blueprint;

        } catch (error: any) {
            console.error('[Orchestrator] Planning phase failed:', error);
            await this.updatePhase('error', 'error');
            this.emit('System', 'failed', `Planning failed: ${error.message}`);
            throw error;
        }
    }

    // ================================================================
    // PHASE 2 — EXECUTION (gated — only called after approval)
    // ================================================================
    async executeAfterApproval(userId: string): Promise<ProjectBlueprint> {
        try {
            // Verify approval state in Firestore before proceeding
            const projectDoc = await adminDb.collection('projects').doc(this.blueprint.id).get();
            const data = projectDoc.data();

            if (data?.status !== 'awaiting_approval') {
                throw new Error(`Cannot execute: project status is '${data?.status}', expected 'awaiting_approval'.`);
            }

            const approvedPlanVersion = data?.activePlanVersion;
            const planVersions = data?.planVersions || [];
            const approvedPlan = planVersions.find((v: any) => v.version === approvedPlanVersion);

            if (!approvedPlan?.plan || approvedPlan.plan.status !== 'approved') {
                throw new Error('Plan is not in approved state. Execution blocked.');
            }

            // Sync blueprint with Firestore approval state
            this.blueprint = { ...this.blueprint, ...data } as ProjectBlueprint;

            await this.updatePhase('executing', 'building');
            await this.auditLogger.executionStarted(approvedPlanVersion);
            this.emit('System', 'running', `🚀 Execution Phase — building under approved plan v${approvedPlanVersion}...`);

            // Phase 2a: Backend Generation (new dedicated agent)
            if (!this.blueprint.backendRoutes) {
                await this.runSequential(AgentId.BACKEND_GENERATION, 'backendRoutes', '⚙️ Backend Agent: Generating API routes with RBAC...');
            }

            // Phase 2b: Parallel — Frontend Code Generation + Logic Builder
            if (!this.blueprint.codebase || !this.blueprint.workflows) {
                this.emit('System', 'running', '⚡ Generating frontend and workflows in parallel...');
                await Promise.all([
                    this.blueprint.codebase ? Promise.resolve() : this.runAgent(AgentId.CODE_GENERATION, 'codebase'),
                    this.blueprint.workflows ? Promise.resolve() : this.runAgent(AgentId.LOGIC_BUILDER, 'workflows')
                ]);
            }

            // SHORT-CIRCUIT: Core app built — redirect user to builder while post-tasks run
            await this.updatePhase('executing', 'deployed');
            this.emit('System', 'completed', '✅ Core application built! Redirecting to Visual Builder...');

            // Phase 2c: Post-generation tasks (background)
            this.runPostGenerationTasks(userId).catch(e =>
                console.error('[Orchestrator Background] Post tasks failed:', e)
            );

            return this.blueprint;

        } catch (error: any) {
            console.error('[Orchestrator] Execution phase failed:', error);
            await this.updatePhase('error', 'error');
            this.emit('System', 'failed', `Execution failed: ${error.message}`);
            throw error;
        }
    }

    private async runPostGenerationTasks(userId: string) {
        try {
            // Security gate (VETO power)
            if (!this.blueprint.securityReport) {
                const secOutput = await this.runSequential(AgentId.SECURITY, 'securityReport', '🔐 Security Agent: Running OWASP audit and attack simulations...');
                if (!secOutput.payload.passed) {
                    this.emit(AgentId.SECURITY, 'vetoed', '🚨 Security Gate FAILED. Deployment blocked. User re-approval required.');
                    await this.auditLogger.securityVeto(secOutput.payload.criticalVulnerabilities);
                    return; // Stop — deployment blocked
                }
            }

            // QA gate (blocks deployment)
            if (!this.blueprint.qualityReport) {
                const qaOutput = await this.runSequential(AgentId.QA_TESTING, 'qualityReport', '🧪 QA Agent: Running full test suite...');
                if (!qaOutput.payload.passed) {
                    this.emit(AgentId.QA_TESTING, 'vetoed', '🚨 QA Gate FAILED. Deployment blocked.');
                    return;
                }
            }

            // Optimization
            await this.runSequential(AgentId.DEBUG_OPTIMIZE, null, '⚡ Optimize Agent: Scanning for performance issues...');

            // ── GitHub: Save to version control ───────────────────────────────────
            await this.commitToGitHub(userId);

            // Deployment
            if (!this.blueprint.deploymentManifest) {
                const deployOutput = await this.runSequential(AgentId.DEPLOYMENT, null, '🚀 Deployment Agent: Generating deployment manifest...');
                if (deployOutput.payload?.deploymentManifest) {
                    this.blueprint.deploymentManifest = deployOutput.payload.deploymentManifest;
                }
                if (deployOutput.payload?.monitoringConfig) {
                    this.blueprint.monitoringConfig = deployOutput.payload.monitoringConfig;
                }
            }

            // Documentation
            await this.runSequential(AgentId.DOCUMENTATION, null, '📄 Generating documentation...');

            await this.updatePhase('completed', 'deployed');
            this.emit('System', 'completed', '🎉 All background tasks complete. Platform is ready.');
        } catch (error) {
            console.error('[Orchestrator Background] Failed:', error);
        }
    }

    // ================================================================
    // GitHub Version Control Integration
    // ================================================================
    private async commitToGitHub(userId: string): Promise<void> {
        try {
            // Check if user has GitHub connected
            const tokenService = new GitHubTokenService(userId);
            const token = await tokenService.getToken();
            if (!token) {
                console.log('[Orchestrator] No GitHub token — skipping version control step.');
                this.emit('System', 'running', '💾 Saving your project...');
                return;
            }

            this.emit('System', 'running', '🐙 Saving your project to GitHub...');

            const prd = this.blueprint.prd;
            const planVersion = this.blueprint.activePlanVersion;
            const allFiles = {
                ...(this.blueprint.codebase?.files || {}),
                ...(Object.fromEntries(
                    (this.blueprint.backendRoutes?.routes || []).map(r => [
                        `src/app/api${r.path}/route.ts`, r.code
                    ])
                ))
            };

            const commitMessage = GitHubIntegrationService.buildCommitMessage({
                platformMode: prd?.platformMode || 'single_app',
                planVersion,
                featureCount: prd?.features?.length || 0,
                pageCount: this.blueprint.architecture?.apiContracts?.length || 0,
                apiCount: this.blueprint.backendRoutes?.routes?.length || 0,
                agentIds: Object.values(AgentId),
                qaCoverage: this.blueprint.qualityReport?.coverage,
                securityCriticals: this.blueprint.securityReport?.criticalVulnerabilities
            });

            const gis = new GitHubIntegrationService(token);
            const repoName = `evolvable-${this.blueprint.originalPrompt
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .substring(0, 30)}`;

            const { repoFullName, repoUrl, branch, commitSha, prNumber, prUrl } =
                await gis.commitCodeToRepository({
                    repoFullName: this.blueprint.github?.repoFullName,
                    repoName,
                    userId,
                    planVersion,
                    platformMode: prd?.platformMode || 'single_app',
                    files: allFiles,
                    commitMessage
                });

            // Persist GitHub state to blueprint and Firestore
            const githubState = {
                repoFullName,
                repoUrl,
                currentBranch: branch,
                mainBranch: 'main',
                latestCommitSha: commitSha,
                openPrNumber: prNumber,
                openPrUrl: prUrl,
                mergedAt: undefined
            };
            this.blueprint.github = githubState;
            await adminDb.collection('projects').doc(this.blueprint.id).update({ github: githubState });

            // Audit log all GitHub events
            await this.auditLogger.githubRepoCreated(repoFullName, planVersion);
            await this.auditLogger.githubBranchCreated(branch, planVersion);
            await this.auditLogger.githubCommitted(commitSha, branch, planVersion);
            await this.auditLogger.githubPrOpened(prNumber, prUrl, planVersion);

            this.emit('System', 'completed',
                `✅ Project saved! A review request has been created. Approve it to publish your app.`);

        } catch (err: any) {
            console.error('[Orchestrator] GitHub commit step failed (non-fatal):', err);
            // Non-fatal — don't block the rest of the pipeline
            this.emit('System', 'running', '⚠️ Could not save to GitHub — continuing without version control.');
        }
    }

    // ================================================================
    // Plan Revision — Replay planning phase with revision notes
    // ================================================================
    async revisePlan(revisionNotes: string, userId: string): Promise<ProjectBlueprint> {
        await this.auditLogger.planRevisionRequested(
            this.blueprint.activePlanVersion,
            revisionNotes,
            userId
        );

        // Reset planning outputs so agents re-run
        this.blueprint.prd = undefined;
        this.blueprint.databaseSchema = undefined;
        this.blueprint.architecture = undefined;

        return this.executePlanningPhase();
    }

    // ================================================================
    // Helpers
    // ================================================================
    private async runSequential(
        agentId: AgentId,
        blueprintKey: keyof ProjectBlueprint | null,
        message: string,
        planningMode = false
    ): Promise<AgentOutput> {
        this.emit(agentId, 'running', message);
        const output = await this.runAgent(agentId, blueprintKey, planningMode);
        this.emit(agentId, 'completed', `${agentId} completed.`, output.payload);
        return output;
    }

    private async runAgent(
        agentId: AgentId,
        blueprintKey: keyof ProjectBlueprint | null,
        planningMode = false
    ): Promise<AgentOutput> {
        const agent = getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not registered.`);

        const input: AgentInput = {
            projectId: this.blueprint.id,
            payload: this.blueprint.originalPrompt,
            blueprint: this.blueprint,
            provider: this.blueprint.llmProvider,
            planningMode
        };

        const output = await agent.execute(input);

        if (output.status === 'failed') {
            throw new Error(`${agentId} failed: ${output.error}`);
        }

        if (blueprintKey && output.payload) {
            (this.blueprint as any)[blueprintKey] = output.payload;
        }

        await this.saveBlueprintProgress(agentId);
        return output;
    }

    private emit(
        agentId: AgentId | 'System',
        status: 'running' | 'completed' | 'failed' | 'vetoed',
        message: string,
        payload?: any
    ) {
        try {
            const logEntry = { timestamp: Date.now(), agentId: agentId !== 'System' ? agentId : 'system', status, message };
            adminDb.collection('projects').doc(this.blueprint.id).update({
                pipelineLogs: FieldValue.arrayUnion(logEntry)
            }).catch(e => console.warn('[Log Stream]', e));
        } catch (e) { console.error('[Log Stream]', e); }

        this.onEvent({ agentId: agentId !== 'System' ? agentId as AgentId : undefined, status, message, payload });
    }

    private async updatePhase(
        phase: ProjectBlueprint['phase'],
        status: ProjectBlueprint['status']
    ) {
        this.blueprint.phase = phase;
        this.blueprint.status = status;
        await adminDb.collection('projects').doc(this.blueprint.id).update({ phase, status });
    }

    private async saveBlueprintProgress(completedAgentId: AgentId) {
        this.blueprint.currentPhase = completedAgentId;
        await adminDb.collection('projects').doc(this.blueprint.id).set(this.blueprint, { merge: true });
    }
}
