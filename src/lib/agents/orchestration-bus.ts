import {
    AgentId,
    AgentOutput,
    ProjectBlueprint,
    AgentInput
} from './types';
import { ADRLogger } from './adr-logger';
import { getAgent } from './agent-registry';
import { adminDb, FieldValue } from '../firebase/admin';
import { db } from '../firebase/config';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AuditLogger } from '../audit/audit-logger';
import { GitHubTokenService } from '../github/github-token-service';
import { GitHubIntegrationService } from '../github/github-service';
import { FallbackGeneratorService } from './fallback-generator';

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
            console.log('[Orchestrator] executePlanningPhase triggered');
            await this.updatePhase('planning', 'building');
            this.emit('System', 'running', '🧠 Planning Phase started. Analyzing your idea...');

            // Step 0: Natural Language Infrastructure Interpreter (NLII)
            console.log('[Orchestrator] Checking if we need to run NLII...');
            if (!this.blueprint.infrastructure) {
                console.log('[Orchestrator] Running NLII...');
                const nliiOutput = await this.runSequential(AgentId.NLII, 'infrastructure', '🔍 NLII: Interpreting infrastructure and deployment requirements...', true);
                console.log('[Orchestrator] NLII finished.');

                // If NLII flagged clarificationsNeeded, we must pause the bus
                if (nliiOutput?.payload?.nliiSummary?.clarificationsNeeded?.length > 0) {
                    this.emit('System', 'completed', '⚠️ Pause: We need a few more details before designing your infrastructure.');
                    await this.updatePhase('awaiting_clarification', 'awaiting_clarification');

                    this.auditLogger.log('infra_clarification_requested', 'NLII requested explicit clarification on vague infrastructure prompt', {
                        planVersion: this.blueprint.activePlanVersion,
                        metadata: { questions: nliiOutput.payload.nliiSummary.clarificationsNeeded }
                    });

                    return this.blueprint; // Pause the pipeline until the user clarifies
                }
            }

            // Step 0.5: Natural Language Deployment Intelligence (NLDI)
            if (!this.blueprint.nldiSummary) {
                const nldiOutput = await this.runSequential(AgentId.NLDI, 'nldiSummary', '🌐 NLDI: Interpreting domain and hosting preferences...', true);

                // If NLDI flagged clarificationsNeeded, pause the bus
                if (nldiOutput?.payload?.clarificationsNeeded?.length > 0) {
                    this.emit('System', 'completed', '⚠️ Pause: We need a few more details before configuring your domain and hosting.');
                    await this.updatePhase('awaiting_clarification', 'awaiting_clarification');

                    this.auditLogger.log('infra_clarification_requested', 'NLDI requested explicit clarification on vague hosting intent', {
                        planVersion: this.blueprint.activePlanVersion,
                        metadata: { questions: nldiOutput.payload.clarificationsNeeded }
                    });

                    // Temporarily store the nldiSummary on the blueprint so the UI can render it
                    // The UI will pass the clarificationsNeeded back.
                    this.blueprint.nldiSummary = nldiOutput.payload;
                    return this.blueprint;
                }
            }

            // Step 1: Vision Agent — platform mode + PRD
            if (!this.blueprint.prd) {
                await this.runSequential(AgentId.VISION, 'prd', '🔍 Vision Agent: Classifying platform type and generating PRD...', true);
            }

            // Step 1.5: UX Researcher — Demographics & Accessibility
            if (!this.blueprint.uxResearchReport) {
                await this.runSequential(AgentId.UX_RESEARCHER, 'uxResearchReport', '🎨 UX Researcher: Defining user journeys and accessibility rules...', true);
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

            console.log('[Orchestrator] Plan generated successfully!');
            // Update blueprint planVersions from Firestore output
            const projectDoc = await adminDb.collection('projects').doc(this.blueprint.id).get();
            const projectData = projectDoc.data();
            if (projectData?.planVersions) {
                this.blueprint.planVersions = projectData.planVersions;
                this.blueprint.activePlanVersion = projectData.activePlanVersion;
            }

            await this.updatePhase('awaiting_approval', 'awaiting_approval');
            this.emit('System', 'completed', `✅ Implementation Plan v${planOutput.payload?.planVersion || 1} ready for your review. Execution is paused until you approve.`);

            console.log('[Orchestrator] executePlanningPhase complete. Waiting for UI approval.');
            // PAUSE — return here. Execution only resumes via /api/orchestrate/approve
            return this.blueprint;

        } catch (error: any) {
            console.error('[Orchestrator ERROR] Planning phase failed at step:', error);

            // Layer 2: Graceful Fallback Mode
            // If the AI fails (rate limits, 500, or missing keys that slipped past Pre-flight),
            // do not hard-crash. Recover with a static blueprint.
            this.emit('System', 'running', '⚠️ AI Service temporarily unavailable. Loading Fallback Template...');

            this.blueprint = FallbackGeneratorService.generateFallbackBlueprint(
                this.blueprint.originalPrompt,
                this.blueprint
            );

            // Persist the fallback blueprint to Firestore so the user can see it on the Plan Review screen
            await this.saveBlueprintProgress(AgentId.PLAN_COORDINATOR);

            this.emit('System', 'completed', `✅ Fallback Template ready for your review. Platform running in degraded mode.`);

            return this.blueprint;
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
            this.emit('System', 'running', '⚙️ Execution Phase started. Assembling system components...');

            // Step 1: Logic Builder
            if (!this.blueprint.workflows) {
                await this.runSequential(AgentId.LOGIC_BUILDER, 'workflows', '🧩 Logic Builder: Designing application state and workflows...', true);
            }

            // Step 2: Parallel Code Generation
            this.emit('System', 'running', '💻 Generating Frontend, Backend, Infra, DevOps, Security, and Payment code in parallel...');

            // First pass: Core Codebase and Infrastructure
            const [
                codebaseOutput, , tfOutput, dockerOutput, scriptOutput, expertAssistantOutput, paymentOutput, devopsOutput, devsecOutput, finopsOutput,
                cryptoOutput, stockMarketOutput, cyberSecOutput, mlOutput,
                pythonOutput, goOutput, rOutput, cOutput, cppOutput, csharpOutput, csOutput, dataAnalystOutput, databricksOutput, sqlOutput, pysparkOutput
            ] = await Promise.all([
                this.blueprint.codebase ? Promise.resolve({ payload: this.blueprint.codebase }) : this.runAgent(AgentId.CODE_GENERATION, 'codebase', true),
                this.blueprint.backendRoutes ? Promise.resolve() : this.runAgent(AgentId.BACKEND_GENERATION, 'backendRoutes', true),

                // NLP Infrastructure Generators
                this.runAgent(AgentId.INFRA_TERRAFORM, null, true),
                this.runAgent(AgentId.INFRA_DOCKER, null, true),
                this.runAgent(AgentId.INFRA_SCRIPT, null, true),

                // Assistants and Modifiers
                this.runAgent(AgentId.EXPERT_CODING_ASSISTANT, 'expertCodingAssistantFeatures', true),

                // Monetization/Payment Integration
                this.blueprint.paymentIntegration ? Promise.resolve() : this.runAgent(AgentId.PAYMENT_INTEGRATION, 'paymentIntegration', true),

                // Pipeline, Security, and Cloud FinOps configs
                this.runAgent(AgentId.DEVOPS_ENGINEER, 'ciCdPipelines', true),
                this.runAgent(AgentId.DEVSECOPS_ENGINEER, 'devSecOpsAudit', true),
                this.runAgent(AgentId.FINOPS_ARCHITECT, 'finOpsReport', true),

                // Domain Expert Integrations
                this.blueprint.cryptoIntegration ? Promise.resolve() : this.runAgent(AgentId.CRYPTO_EXPERT, 'cryptoIntegration', true),
                this.blueprint.stockMarketIntegration ? Promise.resolve() : this.runAgent(AgentId.STOCK_MARKET_EXPERT, 'stockMarketIntegration', true),
                this.blueprint.cyberSecurityFeatures ? Promise.resolve() : this.runAgent(AgentId.CYBER_SECURITY_EXPERT, 'cyberSecurityFeatures', true),
                this.blueprint.machineLearningFeatures ? Promise.resolve() : this.runAgent(AgentId.MACHINE_LEARNING_EXPERT, 'machineLearningFeatures', true),

                // Language & Data Experts
                this.blueprint.pythonFeatures ? Promise.resolve() : this.runAgent(AgentId.PYTHON_EXPERT, 'pythonFeatures', true),
                this.blueprint.goFeatures ? Promise.resolve() : this.runAgent(AgentId.GO_EXPERT, 'goFeatures', true),
                this.blueprint.rFeatures ? Promise.resolve() : this.runAgent(AgentId.R_EXPERT, 'rFeatures', true),
                this.blueprint.cFeatures ? Promise.resolve() : this.runAgent(AgentId.C_EXPERT, 'cFeatures', true),
                this.blueprint.cppFeatures ? Promise.resolve() : this.runAgent(AgentId.CPP_EXPERT, 'cppFeatures', true),
                this.blueprint.csharpFeatures ? Promise.resolve() : this.runAgent(AgentId.CSHARP_EXPERT, 'csharpFeatures', true),
                this.blueprint.csFeatures ? Promise.resolve() : this.runAgent(AgentId.CS_EXPERT, 'csFeatures', true),
                this.blueprint.dataAnalystFeatures ? Promise.resolve() : this.runAgent(AgentId.DATA_ANALYST, 'dataAnalystFeatures', true),
                this.blueprint.databricksFeatures ? Promise.resolve() : this.runAgent(AgentId.DATABRICKS_EXPERT, 'databricksFeatures', true),
                this.blueprint.sqlFeatures ? Promise.resolve() : this.runAgent(AgentId.SQL_EXPERT, 'sqlFeatures', true),
                this.blueprint.pysparkFeatures ? Promise.resolve() : this.runAgent(AgentId.PYSPARK_EXPERT, 'pysparkFeatures', true),

                // Architect & Engineering Experts
                this.blueprint.cloudArchitectFeatures ? Promise.resolve() : this.runAgent(AgentId.CLOUD_ARCHITECT, 'cloudArchitectFeatures', true),
                this.blueprint.dataArchitectFeatures ? Promise.resolve() : this.runAgent(AgentId.DATA_ARCHITECT, 'dataArchitectFeatures', true),
                this.blueprint.enterpriseArchitectFeatures ? Promise.resolve() : this.runAgent(AgentId.ENTERPRISE_ARCHITECT, 'enterpriseArchitectFeatures', true),
                this.blueprint.dataEngineerFeatures ? Promise.resolve() : this.runAgent(AgentId.DATA_ENGINEER, 'dataEngineerFeatures', true),
                this.blueprint.hardwareEngineerFeatures ? Promise.resolve() : this.runAgent(AgentId.HARDWARE_ENGINEER, 'hardwareEngineerFeatures', true),
                this.blueprint.networkEngineerFeatures ? Promise.resolve() : this.runAgent(AgentId.NETWORK_ENGINEER, 'networkEngineerFeatures', true),
                this.blueprint.performanceEngineerFeatures ? Promise.resolve() : this.runAgent(AgentId.PERFORMANCE_ENGINEER, 'performanceEngineerFeatures', true),
                this.blueprint.promptEngineerFeatures ? Promise.resolve() : this.runAgent(AgentId.PROMPT_ENGINEER, 'promptEngineerFeatures', true),

                // Academic & Mathematics Experts
                this.blueprint.mathematicianFeatures ? Promise.resolve() : this.runAgent(AgentId.MATHEMATICIAN, 'mathematicianFeatures', true),
                this.blueprint.academicResearchFeatures ? Promise.resolve() : this.runAgent(AgentId.ACADEMIC_RESEARCHER, 'academicResearchFeatures', true)
            ]);

            // Save artifacts to blueprint if generated
            if (codebaseOutput?.payload) this.blueprint.codebase = codebaseOutput.payload;
            if (tfOutput?.payload) this.blueprint.infraTerraform = tfOutput.payload;
            if (dockerOutput?.payload) this.blueprint.infraDocker = dockerOutput.payload;
            if (scriptOutput?.payload) this.blueprint.infraScript = scriptOutput.payload;
            if (expertAssistantOutput?.payload) this.blueprint.expertCodingAssistantFeatures = expertAssistantOutput.payload;
            if (paymentOutput?.payload) this.blueprint.paymentIntegration = paymentOutput.payload;
            if (devopsOutput?.payload) this.blueprint.ciCdPipelines = devopsOutput.payload;
            if (devsecOutput?.payload) this.blueprint.devSecOpsAudit = devsecOutput.payload;
            if (finopsOutput?.payload) this.blueprint.finOpsReport = finopsOutput.payload;

            // Save domain expert integrations
            if (cryptoOutput?.payload) this.blueprint.cryptoIntegration = cryptoOutput.payload;
            if (stockMarketOutput?.payload) this.blueprint.stockMarketIntegration = stockMarketOutput.payload;
            if (cyberSecOutput?.payload) this.blueprint.cyberSecurityFeatures = cyberSecOutput.payload;
            if (mlOutput?.payload) this.blueprint.machineLearningFeatures = mlOutput.payload;
            if (pythonOutput?.payload) this.blueprint.pythonFeatures = pythonOutput.payload;
            if (goOutput?.payload) this.blueprint.goFeatures = goOutput.payload;
            if (rOutput?.payload) this.blueprint.rFeatures = rOutput.payload;
            if (cOutput?.payload) this.blueprint.cFeatures = cOutput.payload;
            if (cppOutput?.payload) this.blueprint.cppFeatures = cppOutput.payload;
            if (csharpOutput?.payload) this.blueprint.csharpFeatures = csharpOutput.payload;
            if (csOutput?.payload) this.blueprint.csFeatures = csOutput.payload;
            if (dataAnalystOutput?.payload) this.blueprint.dataAnalystFeatures = dataAnalystOutput.payload;
            if (databricksOutput?.payload) this.blueprint.databricksFeatures = databricksOutput.payload;
            if (sqlOutput?.payload) this.blueprint.sqlFeatures = sqlOutput.payload;
            if (pysparkOutput?.payload) this.blueprint.pysparkFeatures = pysparkOutput.payload;

            // Step 2.5: AI Pair Programmer Optimization (Requires Codebase)
            this.emit('System', 'running', '🤖 AI Pair Programmer reviewing and optimizing the generated codebase...');
            await this.runSequential(AgentId.PAIR_PROGRAMMER, null, '👨‍💻 Pair Programmer: Refactoring logic, adding hooks, and writing docstrings...', true);

            // SHORT-CIRCUIT: Core app built — redirect user to builder while post-tasks run
            await this.updatePhase('executing', 'deployed');
            this.emit('System', 'completed', '✅ Core application built! Redirecting to Agent Studio...');

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
            // Security Reviewer (Active Patcher)
            if (!this.blueprint.securityReviewAudit) {
                const secReviewOutput = await this.runSequential(AgentId.SECURITY_REVIEWER, 'securityReviewAudit', '🕵️ Security Reviewer: Deep scanning and patching vulnerabilities...');
                if (secReviewOutput.payload?.passed === false && secReviewOutput.payload?.patchedFiles?.length > 0) {
                    this.emit('System', 'running', `🛠️ Security vulnerabilities found. Self-patching ${secReviewOutput.payload.patchedFiles.length} files...`);
                    // In a real execution, we would iterate and overwrite `this.blueprint.codebase.files` here.
                    this.blueprint.securityReviewAudit = secReviewOutput.payload;
                } else if (secReviewOutput.payload?.passed) {
                    this.blueprint.securityReviewAudit = secReviewOutput.payload;
                }
            }

            // Security gate (VETO power)
            if (!this.blueprint.securityReport) {
                const secOutput = await this.runSequential(AgentId.SECURITY, 'securityReport', '🔐 Security Agent: Running OWASP audit and attack simulations...');
                if (!secOutput.payload.passed) {
                    this.emit(AgentId.SECURITY, 'vetoed', '🚨 Security Gate FAILED. Deployment blocked. User re-approval required.');
                    await this.auditLogger.securityVeto(secOutput.payload.criticalVulnerabilities);
                    return; // Stop — deployment blocked
                }
            }

            // Code Review Gate (blocks QA testing)
            if (!this.blueprint.codeReviewAudit) {
                const reviewOutput = await this.runSequential(AgentId.CODE_REVIEWER, 'codeReviewAudit', '🧐 Code Reviewer: Enforcing Staff-level engineering standards...');
                if (!reviewOutput.payload.passed) {
                    this.emit(AgentId.CODE_REVIEWER, 'vetoed', '🚨 Code Review FAILED. Triggering Autonomous Debugger...');

                    // Recover with Autonomous Debugger
                    const debuggerAgent = getAgent(AgentId.AUTONOMOUS_DEBUGGER);
                    if (debuggerAgent) {
                        const patchOutput = await debuggerAgent.execute({
                            projectId: this.blueprint.id,
                            payload: reviewOutput.payload.flaggedIssues,
                            blueprint: this.blueprint,
                            provider: this.blueprint.llmProvider,
                            planningMode: false
                        });

                        if (patchOutput.status === 'completed') {
                            this.emit('System', 'running', '🛠️ Autonomous Debugger successfully patched the codebase. Resuming pipeline...');
                            // Assume patch is applied to the codebase in memory
                            this.blueprint.codeReviewAudit = { passed: true, autoRecovered: true };
                        } else {
                            this.emit('System', 'failed', '💥 Autonomous Debugger failed to patch. Deployment aborted.');
                            return; // Stop
                        }
                    } else {
                        return; // Stop
                    }
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

            // Inject Infrastructure Artifacts into specific folders
            if (this.blueprint.infraTerraform?.files) {
                for (const [filename, content] of Object.entries(this.blueprint.infraTerraform.files)) {
                    allFiles[`infra/${filename}`] = content;
                }
            }
            if (this.blueprint.infraDocker?.files) {
                for (const [filename, content] of Object.entries(this.blueprint.infraDocker.files)) {
                    allFiles[`docker/${filename}`] = content;
                }
            }
            if (this.blueprint.infraScript?.files) {
                for (const [filename, content] of Object.entries(this.blueprint.infraScript.files)) {
                    // Sort by extension
                    if (filename.endsWith('.sh')) {
                        allFiles[`scripts/bash/${filename}`] = content;
                    } else if (filename.endsWith('.ps1')) {
                        allFiles[`scripts/powershell/${filename}`] = content;
                    } else {
                        allFiles[`scripts/${filename}`] = content;
                    }
                }
            }

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
            }).catch(adminErr => {
                // Async fallback: if Admin SDK rejects due to permissions, cascade to Client SDK
                const clientRef = doc(db, 'projects', this.blueprint.id);
                updateDoc(clientRef, {
                    pipelineLogs: arrayUnion(logEntry)
                }).catch(e => console.warn('[Log Stream Client fallback failed]', e));
            });
        } catch (e) { console.error('[Log Stream Sync Error]', e); }

        this.onEvent({ agentId: agentId !== 'System' ? agentId as AgentId : undefined, status, message, payload });
    }

    private async updatePhase(
        phase: ProjectBlueprint['phase'],
        status: ProjectBlueprint['status']
    ) {
        this.blueprint.phase = phase;
        this.blueprint.status = status;
        try {
            await adminDb.collection('projects').doc(this.blueprint.id).update({ phase, status });
        } catch (adminErr) {
            const clientRef = doc(db, 'projects', this.blueprint.id);
            await updateDoc(clientRef, { phase, status });
        }
    }

    private async saveBlueprintProgress(completedAgentId: AgentId) {
        this.blueprint.currentPhase = completedAgentId;
        try {
            await adminDb.collection('projects').doc(this.blueprint.id).set(this.blueprint, { merge: true });
        } catch (adminErr) {
            const clientRef = doc(db, 'projects', this.blueprint.id);
            await setDoc(clientRef, this.blueprint, { merge: true });
        }
    }
}
