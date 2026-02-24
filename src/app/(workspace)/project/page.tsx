'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProjectBlueprint } from '@/lib/agents/types';
import styles from './project.module.css';
import { IDESidebar } from '@/components/ide-sidebar/IDESidebar';
import {
    Cpu, Zap, Shield, TestTube2, Rocket, Eye, Code2, Network,
    ChevronRight, ExternalLink, GitBranch, Clock, CheckCircle2,
    XCircle, Loader2, AlertTriangle, FileCode2, Layers,
    BrainCircuit, Palette, Database, Server, FileSearch,
} from 'lucide-react';

/* ===== Agent Pipeline Phase Config ===== */
const PIPELINE_PHASES: {
    id: string;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    color: string;
    agents: string[];
}[] = [
        { id: 'planning', label: 'Planning', Icon: BrainCircuit, color: '#a855f7', agents: ['Vision Agent', 'NLII Agent'] },
        { id: 'design', label: 'Design & Architecture', Icon: Palette, color: '#ec4899', agents: ['UI Designer', 'DB Architect', 'System Architect'] },
        { id: 'review', label: 'Plan Review', Icon: FileSearch, color: '#06b6d4', agents: ['Plan Coordinator'] },
        { id: 'generation', label: 'Code Generation', Icon: Code2, color: '#4285f4', agents: ['Backend Gen', 'Frontend Gen', 'Logic Builder'] },
        { id: 'quality', label: 'Quality & Security', Icon: Shield, color: '#fbbf24', agents: ['Security Agent', 'QA Testing', 'Debug & Optimize'] },
        { id: 'infra', label: 'Infrastructure', Icon: Server, color: '#f97316', agents: ['DevOps', 'Infra Docker', 'Infra Terraform'] },
        { id: 'deployment', label: 'Deployment', Icon: Rocket, color: '#4ade80', agents: ['Deployment Agent', 'Documentation'] },
    ];

function getPhaseIndex(phase?: string): number {
    if (!phase) return 0;
    const map: Record<string, number> = {
        vision: 0, nlii: 0, nldi: 0,
        ui_designer: 1, db_architect: 1, system_architect: 1,
        plan_coordinator: 2,
        code_generation: 3, backend_generation: 3, logic_builder: 3, frontend_generation: 3,
        qa_testing: 4, security: 4, debug_optimize: 4,
        infra_docker: 5, infra_terraform: 5, infra_script: 5, devops: 5,
        deployment: 6, documentation: 6,
    };
    return map[phase] ?? 0;
}

function getPhaseStatus(index: number, currentIndex: number, projectStatus?: string) {
    if (projectStatus === 'deployed') return 'completed';
    if (projectStatus === 'error') return index <= currentIndex ? 'failed' : 'pending';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'pending';
}

export default function ProjectPage() {
    const { user } = useAuth();
    const params = useSearchParams();
    const projectId = params.get('projectId');
    const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'stream' | 'code' | 'architecture'>('stream');
    const [devMode, setDevMode] = useState(false);
    const streamRef = useRef<HTMLDivElement>(null);

    // Real-time Firestore subscription
    useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
            if (snap.exists()) {
                setBlueprint(snap.data() as ProjectBlueprint);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [projectId]);

    // Dev mode persistence
    useEffect(() => {
        const saved = localStorage.getItem('ev_dev_mode');
        if (saved === 'true') setDevMode(true);
    }, []);

    const toggleDevMode = () => {
        const next = !devMode;
        setDevMode(next);
        localStorage.setItem('ev_dev_mode', String(next));
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <Loader2 size={32} className={styles.spin} />
                <span>Loading project...</span>
            </div>
        );
    }

    if (!blueprint) {
        return (
            <div className={styles.emptyScreen}>
                <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <h2>No Project Found</h2>
                <p>This project doesn't exist or you don't have access.</p>
                <a href="/dashboard" className={styles.backLink}>← Back to Mission Control</a>
            </div>
        );
    }

    const currentPhaseIndex = getPhaseIndex(blueprint.currentPhase);
    const projectStatus = blueprint.status;
    const isDeployed = projectStatus === 'deployed';
    const isBuilding = projectStatus === 'building';
    const title = blueprint.prd?.title || `Project ${projectId?.substring(0, 8)}`;
    const platformMode = blueprint.prd?.platformMode?.replace(/_/g, ' ') || 'Initializing';
    const featureCount = blueprint.prd?.features?.length || 0;

    // Collect generated files for the code view
    const codeFiles: { name: string; content: string }[] = [];
    if (blueprint.codebase?.files) {
        Object.entries(blueprint.codebase.files).forEach(([name, content]) => {
            codeFiles.push({ name, content: typeof content === 'string' ? content : JSON.stringify(content, null, 2) });
        });
    }

    return (
        <div className={styles.workspace}>
            {/* Dev Mode: IDE Sidebar */}
            {devMode && (
                <IDESidebar blueprint={blueprint} projectId={projectId} isVisible={devMode} />
            )}

            {/* Main Content */}
            <div className={styles.mainArea}>
                {/* Top Toolbar */}
                <header className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <BrainCircuit size={18} className={styles.toolbarIcon} />
                        <div>
                            <h1 className={styles.projectTitle}>{title}</h1>
                            <span className={styles.projectMeta}>{platformMode} · {featureCount} features</span>
                        </div>
                    </div>
                    <div className={styles.toolbarRight}>
                        <div className={`${styles.statusChip} ${styles[projectStatus || 'building']}`}>
                            {isDeployed ? <CheckCircle2 size={12} /> : isBuilding ? <Loader2 size={12} className={styles.spin} /> : <Clock size={12} />}
                            <span>{isDeployed ? 'Live' : isBuilding ? 'Agents Working' : projectStatus?.replace(/_/g, ' ') || 'Initializing'}</span>
                        </div>
                        {blueprint.github?.repoFullName && (
                            <a href={blueprint.github.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.githubChip}>
                                <GitBranch size={12} />
                                <span>{blueprint.github.currentBranch || 'main'}</span>
                            </a>
                        )}
                        <button onClick={toggleDevMode} className={`${styles.devToggle} ${devMode ? styles.devActive : ''}`} title="Toggle Dev Mode">
                            <Code2 size={14} />
                            <span>Dev Mode</span>
                        </button>
                    </div>
                </header>

                {/* View Tabs */}
                <div className={styles.viewTabs}>
                    {([
                        { id: 'stream', Icon: Cpu, label: 'Agent Stream' },
                        { id: 'code', Icon: FileCode2, label: 'Generated Code' },
                        { id: 'architecture', Icon: Network, label: 'Architecture' },
                    ] as const).map(({ id, Icon, label }) => (
                        <button
                            key={id}
                            className={`${styles.viewTab} ${activeView === id ? styles.viewTabActive : ''}`}
                            onClick={() => setActiveView(id)}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className={styles.contentArea}>
                    {/* ===== AGENT EXECUTION STREAM ===== */}
                    {activeView === 'stream' && (
                        <div className={styles.streamView} ref={streamRef}>
                            {/* Pipeline Progress */}
                            <div className={styles.pipeline}>
                                {PIPELINE_PHASES.map((phase, i) => {
                                    const status = getPhaseStatus(i, currentPhaseIndex, projectStatus);
                                    return (
                                        <div key={phase.id} className={`${styles.pipelinePhase} ${styles[`phase_${status}`]}`}>
                                            <div className={styles.phaseIcon} style={{ borderColor: status === 'pending' ? 'rgba(255,255,255,0.1)' : phase.color }}>
                                                {status === 'completed' ? <CheckCircle2 size={16} style={{ color: '#4ade80' }} /> :
                                                    status === 'active' ? <Loader2 size={16} className={styles.spin} style={{ color: phase.color }} /> :
                                                        status === 'failed' ? <XCircle size={16} style={{ color: '#f87171' }} /> :
                                                            <phase.Icon size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                                            </div>
                                            <div className={styles.phaseInfo}>
                                                <span className={styles.phaseLabel}>{phase.label}</span>
                                                <span className={styles.phaseAgents}>
                                                    {phase.agents.join(' · ')}
                                                </span>
                                            </div>
                                            {i < PIPELINE_PHASES.length - 1 && (
                                                <ChevronRight size={14} className={styles.phaseArrow} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Agent Activity Feed */}
                            <div className={styles.activityFeed}>
                                <div className={styles.feedHeader}>
                                    <Zap size={14} />
                                    <span>Agent Activity</span>
                                </div>
                                {(blueprint as any).agentOutputs ? (
                                    Object.entries((blueprint as any).agentOutputs).map(([agentId, output], i) => (
                                        <div key={agentId} className={styles.feedItem}>
                                            <div className={styles.feedDot} style={{ background: PIPELINE_PHASES[getPhaseIndex(agentId)]?.color || '#4285f4' }} />
                                            <div className={styles.feedContent}>
                                                <span className={styles.feedAgent}>{agentId.replace(/_/g, ' ')}</span>
                                                <span className={styles.feedStatus}>Completed</span>
                                            </div>
                                            <CheckCircle2 size={12} style={{ color: '#4ade80' }} />
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.feedEmpty}>
                                        <Loader2 size={16} className={styles.spin} />
                                        <span>Waiting for agent activity...</span>
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className={styles.quickStats}>
                                <div className={styles.statBox}>
                                    <Layers size={14} />
                                    <span className={styles.statValue}>{featureCount}</span>
                                    <span className={styles.statLabel}>Features</span>
                                </div>
                                <div className={styles.statBox}>
                                    <FileCode2 size={14} />
                                    <span className={styles.statValue}>{codeFiles.length}</span>
                                    <span className={styles.statLabel}>Files</span>
                                </div>
                                <div className={styles.statBox}>
                                    <Database size={14} />
                                    <span className={styles.statValue}>{blueprint.prd?.dataEntities?.length || 0}</span>
                                    <span className={styles.statLabel}>Entities</span>
                                </div>
                                <div className={styles.statBox}>
                                    <Shield size={14} />
                                    <span className={styles.statValue}>{blueprint.prd?.userRoles?.length || 0}</span>
                                    <span className={styles.statLabel}>Roles</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GENERATED CODE VIEW ===== */}
                    {activeView === 'code' && (
                        <div className={styles.codeView}>
                            {codeFiles.length === 0 ? (
                                <div className={styles.codeEmpty}>
                                    <Code2 size={36} style={{ opacity: 0.2 }} />
                                    <h3>No code generated yet</h3>
                                    <p>Agents are still working. Code will appear here as it's generated.</p>
                                </div>
                            ) : (
                                <div className={styles.codeFileList}>
                                    {codeFiles.map((file, i) => (
                                        <details key={i} className={styles.codeFile}>
                                            <summary className={styles.codeFileName}>
                                                <FileCode2 size={13} />
                                                {file.name}
                                                <span className={styles.codeFileSize}>{file.content.length.toLocaleString()} chars</span>
                                            </summary>
                                            <pre className={styles.codeBlock}>
                                                <code>{file.content}</code>
                                            </pre>
                                        </details>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== ARCHITECTURE VIEW ===== */}
                    {activeView === 'architecture' && (
                        <div className={styles.archView}>
                            <div className={styles.archHeader}>
                                <Network size={18} />
                                <h3>System Architecture</h3>
                                <span className={styles.archBadge}>Auto-generated from blueprint</span>
                            </div>

                            {/* Platform Info */}
                            <div className={styles.archSection}>
                                <h4>Platform Configuration</h4>
                                <div className={styles.archGrid}>
                                    <div className={styles.archCard}>
                                        <span className={styles.archCardLabel}>Mode</span>
                                        <span className={styles.archCardValue}>{platformMode}</span>
                                    </div>
                                    <div className={styles.archCard}>
                                        <span className={styles.archCardLabel}>Framework</span>
                                        <span className={styles.archCardValue}>{(blueprint.prd as any)?.techStack?.framework || 'Next.js'}</span>
                                    </div>
                                    <div className={styles.archCard}>
                                        <span className={styles.archCardLabel}>Database</span>
                                        <span className={styles.archCardValue}>{(blueprint.prd as any)?.techStack?.database || 'Firestore'}</span>
                                    </div>
                                    <div className={styles.archCard}>
                                        <span className={styles.archCardLabel}>Auth</span>
                                        <span className={styles.archCardValue}>{(blueprint.prd as any)?.techStack?.auth || 'NextAuth'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Data Entities */}
                            {blueprint.prd?.dataEntities && blueprint.prd.dataEntities.length > 0 && (
                                <div className={styles.archSection}>
                                    <h4>Data Entities</h4>
                                    <div className={styles.entityList}>
                                        {blueprint.prd.dataEntities.map((entity: any, i: number) => (
                                            <div key={i} className={styles.entityCard}>
                                                <Database size={13} />
                                                <span>{typeof entity === 'string' ? entity : entity.name || `Entity ${i + 1}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* User Roles */}
                            {blueprint.prd?.userRoles && blueprint.prd.userRoles.length > 0 && (
                                <div className={styles.archSection}>
                                    <h4>User Roles</h4>
                                    <div className={styles.entityList}>
                                        {blueprint.prd.userRoles.map((role: any, i: number) => (
                                            <div key={i} className={styles.entityCard}>
                                                <Shield size={13} />
                                                <span>{typeof role === 'string' ? role : role.name || role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Features */}
                            {blueprint.prd?.features && blueprint.prd.features.length > 0 && (
                                <div className={styles.archSection}>
                                    <h4>Feature Inventory ({blueprint.prd.features.length})</h4>
                                    <div className={styles.featureList}>
                                        {blueprint.prd.features.map((f: any, i: number) => (
                                            <div key={i} className={styles.featureItem}>
                                                <CheckCircle2 size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                                                <span>{f.title || f}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                {(projectStatus === 'awaiting_approval' || projectStatus === 'awaiting_clarification') && (
                    <div className={styles.actionBar}>
                        <a href={`/plan-review?projectId=${projectId}`} className={styles.actionButton}>
                            {projectStatus === 'awaiting_approval' ? (
                                <><Eye size={14} /> Review & Approve Plan</>
                            ) : (
                                <><AlertTriangle size={14} /> Answer Agent Questions</>
                            )}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
