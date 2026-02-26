'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-context';
import { useOrchestration } from '@/lib/hooks/useOrchestration';
import {
    LLMProvider,
    AIModel,
    AVAILABLE_MODELS,
    ProjectBlueprint,
    ImplementationPlan,
    PlanVersion,
} from '@/lib/agents/types';
import {
    ChevronRight,
    Loader2,
    CheckCircle2,
    XCircle,
    Zap,
    FileCode2,
    Rocket,
    BrainCircuit,
    Send,
    X,
} from 'lucide-react';
import styles from './mission.module.css';

// Plan review section definitions
type Section = 'executive' | 'architecture' | 'features' | 'database' | 'security' | 'deployment' | 'testing' | 'monetization' | 'integrations' | 'domain_hosting';

const PLAN_SECTIONS: { key: Section; label: string; icon: string }[] = [
    { key: 'executive', label: 'Executive Summary', icon: '📋' },
    { key: 'architecture', label: 'Architecture', icon: '🏗️' },
    { key: 'features', label: 'Features & Pages', icon: '✨' },
    { key: 'database', label: 'Database Schema', icon: '🗄️' },
    { key: 'security', label: 'Security Plan', icon: '🛡️' },
    { key: 'deployment', label: 'Deployment', icon: '🚀' },
    { key: 'testing', label: 'Testing Strategy', icon: '🧪' },
    { key: 'monetization', label: 'Monetization', icon: '💰' },
    { key: 'integrations', label: 'Integrations', icon: '🔗' },
    { key: 'domain_hosting', label: 'Domain & Hosting', icon: '🌐' },
];

// Progress rail phase definitions
const RAIL_PHASES = [
    { id: 'intent', label: 'Intent', icon: '💡' },
    { id: 'planning', label: 'Planning', icon: '🧠' },
    { id: 'review', label: 'Plan Review', icon: '📋' },
    { id: 'execution', label: 'Execution', icon: '⚙️' },
    { id: 'code', label: 'Generated Code', icon: '💻' },
    { id: 'deploy', label: 'Deployment', icon: '🚀' },
];

type WorkspacePhase = 'idle' | 'planning' | 'awaiting_approval' | 'building' | 'deployed' | 'error';

function getWorkspacePhase(blueprint: ProjectBlueprint | null): WorkspacePhase {
    if (!blueprint) return 'idle';
    if (blueprint.status === 'deployed') return 'deployed';
    if (blueprint.status === 'error') return 'error';
    if (blueprint.status === 'awaiting_approval' || blueprint.status === 'awaiting_clarification') return 'awaiting_approval';
    if (blueprint.status === 'building' && blueprint.phase === 'planning') return 'planning';
    if (blueprint.status === 'building') return 'building';
    return 'idle';
}

function getRailStatus(railId: string, phase: WorkspacePhase, hasCode: boolean) {
    const order = ['intent', 'planning', 'review', 'execution', 'code', 'deploy'];
    const phaseMap: Record<WorkspacePhase, string> = {
        idle: 'intent',
        planning: 'planning',
        awaiting_approval: 'review',
        building: 'execution',
        deployed: 'deploy',
        error: 'execution',
    };
    const currentRail = phaseMap[phase];
    const currentIdx = order.indexOf(currentRail);
    const thisIdx = order.indexOf(railId);

    if (railId === 'code' && hasCode) return 'done';
    if (phase === 'error' && railId === 'execution') return 'error';
    if (thisIdx < currentIdx) return 'done';
    if (thisIdx === currentIdx) return 'active';
    return 'pending';
}

export default function CreatePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { startPipeline, abortPipeline, isLoading: isOrchestrating, projectId: hookProjectId } = useOrchestration();

    // Core state
    const [idea, setIdea] = useState('');
    const [model, setModel] = useState<AIModel>('gpt-5.2');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);

    // Plan review state
    const [activePlan, setActivePlan] = useState<ImplementationPlan | null>(null);
    const [expandedPlanSections, setExpandedPlanSections] = useState<Set<Section>>(new Set(['executive']));
    const [showRevisionInput, setShowRevisionInput] = useState(false);
    const [revisionNotes, setRevisionNotes] = useState('');
    const [approvalLoading, setApprovalLoading] = useState(false);
    const [approvalError, setApprovalError] = useState<string | null>(null);

    // UI state
    const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync project ID from hook
    useEffect(() => {
        if (hookProjectId) setProjectId(hookProjectId);
    }, [hookProjectId]);

    // Real-time Firestore subscription
    useEffect(() => {
        if (!projectId) return;
        const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as ProjectBlueprint;
                setBlueprint(data);
                // Extract active plan
                const planVer = data.planVersions?.find((v: PlanVersion) => v.version === data.activePlanVersion);
                setActivePlan(planVer?.plan || null);
            }
        });
        return () => unsub();
    }, [projectId]);

    // Auto-scroll to bottom when new content arrives
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [blueprint?.pipelineLogs?.length, blueprint?.status]);

    // Current phase
    const phase = getWorkspacePhase(blueprint);
    const hasCode = !!(blueprint?.codebase?.files && Object.keys(blueprint.codebase.files).length > 0);

    // Handlers
    const handleLaunch = async () => {
        if (!idea.trim()) return;
        const selectedModelDef = AVAILABLE_MODELS.find(m => m.id === model);
        const providerToPass = selectedModelDef ? selectedModelDef.provider : 'openai';
        try {
            const newId = await startPipeline(idea, user?.uid || 'anonymous', providerToPass, model);
            if (newId) setProjectId(newId);
        } catch (err: any) {
            console.error('Launch failed:', err);
        }
    };

    const handleApprove = useCallback(async () => {
        if (!user || !blueprint || !activePlan || !projectId) return;
        setApprovalLoading(true);
        setApprovalError(null);
        try {
            const res = await fetch('/api/orchestrate/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, userId: user.uid, planVersion: blueprint.activePlanVersion }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            // State transitions via Firestore — no navigation needed
        } catch (err: any) {
            setApprovalError(err.message);
        } finally {
            setApprovalLoading(false);
        }
    }, [user, blueprint, activePlan, projectId]);

    const handleRevise = useCallback(async () => {
        if (!user || !blueprint || !revisionNotes.trim() || !projectId) return;
        setApprovalLoading(true);
        setApprovalError(null);
        try {
            const res = await fetch('/api/orchestrate/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, userId: user.uid, revisionNotes }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRevisionNotes('');
            setShowRevisionInput(false);
        } catch (err: any) {
            setApprovalError(err.message);
        } finally {
            setApprovalLoading(false);
        }
    }, [user, blueprint, revisionNotes, projectId]);

    const toggleCard = (id: string) => {
        setCollapsedCards(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const togglePlanSection = (key: Section) => {
        setExpandedPlanSections(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleFile = (name: string) => {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    // Collect code files
    const codeFiles: { name: string; content: string }[] = [];
    if (blueprint?.codebase?.files) {
        Object.entries(blueprint.codebase.files).forEach(([name, content]) => {
            codeFiles.push({ name, content: typeof content === 'string' ? content : JSON.stringify(content, null, 2) });
        });
    }

    // Plan section renderer
    const renderPlanSectionContent = (key: Section) => {
        if (!activePlan) return null;
        switch (key) {
            case 'executive': {
                const ex = activePlan.executiveSummary;
                if (!ex) return <span>No summary available.</span>;
                return (
                    <div>
                        <div className={styles.planBadges}>
                            <span className={styles.planBadge + ' ' + styles.planBadgeBlue}>{ex.appType?.replace(/_/g, ' ')}</span>
                            <span className={styles.planBadge + ' ' + styles.planBadgeGreen}>{ex.estimatedComplexity}</span>
                            <span className={styles.planBadge + ' ' + styles.planBadgeBlue}>⏱ {ex.estimatedBuildTime}</span>
                        </div>
                        <p style={{ marginBottom: '0.5rem' }}>{ex.overview}</p>
                        {ex.monetizationModel && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>💰 {ex.monetizationModel.replace(/_/g, ' ')}</p>}
                    </div>
                );
            }
            case 'architecture': {
                const arch = activePlan.architecture;
                if (!arch) return <span>No architecture defined.</span>;
                return (
                    <div>
                        {arch.frontend && <p><strong>Frontend:</strong> {typeof arch.frontend === 'string' ? arch.frontend : JSON.stringify(arch.frontend)}</p>}
                        {arch.backend && <p><strong>Backend:</strong> {typeof arch.backend === 'string' ? arch.backend : JSON.stringify(arch.backend)}</p>}
                        {arch.database && <p><strong>Database:</strong> {typeof arch.database === 'string' ? arch.database : JSON.stringify(arch.database)}</p>}
                    </div>
                );
            }
            case 'features': {
                const fe = activePlan.features;
                if (!fe || !Array.isArray(fe) || fe.length === 0) return <span>No features defined.</span>;
                return (
                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {fe.map((f: any, i: number) => (
                            <li key={i} style={{ color: 'rgba(255,255,255,0.6)' }}>
                                <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{f.name || f.title || f}</strong>
                                {f.description && <span> — {f.description}</span>}
                            </li>
                        ))}
                    </ul>
                );
            }
            case 'database': {
                const db = activePlan.databaseSchema || (activePlan as any).database;
                if (!db) return <span>No database schema.</span>;
                return <pre style={{ fontSize: '0.72rem', color: '#ce9178', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{typeof db === 'string' ? db : JSON.stringify(db, null, 2)}</pre>;
            }
            case 'security': {
                const sec = activePlan.securityPlan || (activePlan as any).security;
                if (!sec) return <span>No security plan.</span>;
                return <pre style={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>{typeof sec === 'string' ? sec : JSON.stringify(sec, null, 2)}</pre>;
            }
            default: {
                const data = (activePlan as any)[key];
                if (!data) return <span>No data available.</span>;
                return <pre style={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
            }
        }
    };

    const statusLabel = phase === 'planning' ? 'Planning…' :
        phase === 'awaiting_approval' ? 'Awaiting Approval' :
            phase === 'building' ? 'Agents Working…' :
                phase === 'deployed' ? 'Deployed ✓' :
                    phase === 'error' ? 'Error' : 'Ready';

    const statusClass = phase === 'building' || phase === 'planning' ? styles.statusBuilding :
        phase === 'awaiting_approval' ? styles.statusApproval :
            phase === 'deployed' ? styles.statusDeployed :
                phase === 'error' ? styles.statusError : '';

    const title = blueprint?.prd?.title || 'New Project';
    const platformMode = blueprint?.prd?.platformMode?.replace(/_/g, ' ') || '';
    const featureCount = blueprint?.prd?.features?.length || 0;

    return (
        <div className={styles.workspace}>
            {/* ═══ Progress Rail ═══ */}
            <aside className={styles.progressRail}>
                <div className={styles.railHeader}>Mission Progress</div>

                {RAIL_PHASES.map(rp => {
                    const status = getRailStatus(rp.id, phase, hasCode);
                    return (
                        <div key={rp.id} className={`${styles.railPhase} ${status === 'active' ? styles.railPhaseActive : ''}`}>
                            <div className={`${styles.railDot} ${status === 'active' ? styles.railDotActive :
                                status === 'done' ? styles.railDotDone :
                                    status === 'error' ? styles.railDotError :
                                        styles.railDotPending
                                }`} />
                            <span className={`${styles.railLabel} ${status === 'active' ? styles.railLabelActive :
                                status === 'done' ? styles.railLabelDone : ''
                                }`}>
                                {rp.icon} {rp.label}
                            </span>
                        </div>
                    );
                })}

                {projectId && (
                    <div className={styles.railFooter}>
                        <div className={styles.railProjectId}>
                            <div className={styles.railProjectIdLabel}>Project ID</div>
                            <div className={styles.railProjectIdValue}>{projectId.substring(0, 20)}…</div>
                        </div>
                    </div>
                )}
            </aside>

            {/* ═══ Main Canvas ═══ */}
            <div className={styles.canvas}>
                {/* Header Bar */}
                <div className={styles.canvasHeader}>
                    <div>
                        <div className={styles.canvasTitle}>{title}</div>
                        {platformMode && (
                            <div className={styles.canvasSubtitle}>{platformMode} · {featureCount} features</div>
                        )}
                    </div>
                    {phase !== 'idle' && (
                        <div className={`${styles.canvasStatus} ${statusClass}`}>
                            {(phase === 'planning' || phase === 'building') && <Loader2 size={12} className={styles.spin} />}
                            {phase === 'deployed' && <CheckCircle2 size={12} />}
                            {phase === 'error' && <XCircle size={12} />}
                            <span>{statusLabel}</span>
                        </div>
                    )}
                </div>

                {/* Scroll Canvas */}
                <div className={styles.scrollArea} ref={scrollRef}>

                    {/* ────────────────────────────────────────────────
                        CARD 1: Intent
                    ──────────────────────────────────────────────── */}
                    <div className={`${styles.phaseCard} ${phase === 'idle' ? styles.phaseCardActive : ''}`}>
                        <div className={styles.phaseCardHeader} onClick={() => toggleCard('intent')}>
                            <span className={styles.phaseIcon}>💡</span>
                            <span className={styles.phaseTitle}>Your Idea</span>
                            <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('intent') ? styles.phaseChevronOpen : ''}`} />
                        </div>
                        {!collapsedCards.has('intent') && (
                            <div className={styles.phaseBody}>
                                {phase === 'idle' ? (
                                    <div className={styles.intentInput}>
                                        <textarea
                                            className={styles.intentTextarea}
                                            value={idea}
                                            onChange={e => setIdea(e.target.value)}
                                            placeholder="Describe the app you want to build… e.g. 'A SaaS dashboard for tracking crypto portfolios with real-time alerts'"
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleLaunch(); } }}
                                        />
                                        <div className={styles.intentRow}>
                                            <select className={styles.modelSelect} value={model} onChange={e => setModel(e.target.value as AIModel)}>
                                                {(() => {
                                                    const grouped = AVAILABLE_MODELS.reduce((acc: Record<string, typeof AVAILABLE_MODELS>, m) => {
                                                        const p = m.provider.charAt(0).toUpperCase() + m.provider.slice(1);
                                                        if (!acc[p]) acc[p] = [];
                                                        acc[p].push(m);
                                                        return acc;
                                                    }, {});
                                                    return Object.entries(grouped).map(([provider, models]) => (
                                                        <optgroup key={provider} label={provider}>
                                                            {models.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name} — {m.description}</option>
                                                            ))}
                                                        </optgroup>
                                                    ));
                                                })()}
                                            </select>
                                            <button
                                                className={styles.launchButton}
                                                onClick={handleLaunch}
                                                disabled={!idea.trim() || isOrchestrating}
                                            >
                                                {isOrchestrating ? <Loader2 size={16} className={styles.spin} /> : <><Send size={14} /> Launch</>}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className={styles.ideaDisplay}>{blueprint?.originalPrompt || idea}</div>
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <span className={styles.modelBadge}>
                                                🤖 {AVAILABLE_MODELS.find(m => m.id === (blueprint?.llmModel || model))?.name || model}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ────────────────────────────────────────────────
                        CARD 2: Planning Stream
                    ──────────────────────────────────────────────── */}
                    {phase !== 'idle' && (
                        <div className={`${styles.phaseCard} ${phase === 'planning' ? styles.phaseCardActive : ''}`}>
                            <div className={styles.phaseCardHeader} onClick={() => toggleCard('planning')}>
                                <span className={styles.phaseIcon}>🧠</span>
                                <span className={styles.phaseTitle}>Planning Phase</span>
                                {phase === 'planning' && <Loader2 size={14} className={styles.spin} style={{ color: '#a855f7' }} />}
                                {phase !== 'planning' && phase !== 'idle' && <CheckCircle2 size={14} style={{ color: '#4ade80' }} />}
                                <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('planning') ? styles.phaseChevronOpen : ''}`} />
                            </div>
                            {!collapsedCards.has('planning') && (
                                <div className={styles.phaseBody}>
                                    <div className={styles.logStream}>
                                        {(blueprint?.pipelineLogs || [])
                                            .filter(l => {
                                                const planningAgents = ['nlii', 'nldi', 'vision', 'ui_designer', 'db_architect', 'system_architect', 'plan_coordinator', 'System'];
                                                return planningAgents.includes(l.agentId || 'System');
                                            })
                                            .map((log, i) => (
                                                <div key={i} className={styles.logEntry}>
                                                    <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className={styles.logAgent}>{(log.agentId || 'system').replace(/_/g, ' ')}</span>
                                                    <span className={`${styles.logMsg} ${log.status === 'failed' ? styles.logMsgError : log.status === 'completed' ? styles.logMsgSuccess : ''}`}>
                                                        {log.message}
                                                    </span>
                                                </div>
                                            ))}
                                        {phase === 'planning' && (
                                            <div className={styles.logEntry}>
                                                <span className={styles.logTime}></span>
                                                <span className={styles.logAgent}></span>
                                                <span className={styles.logMsg}><Loader2 size={12} className={styles.spin} /> Agents working…</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────
                        CARD 3: Plan Review (Inline Approval)
                    ──────────────────────────────────────────────── */}
                    {(phase === 'awaiting_approval' || (activePlan && phase !== 'idle' && phase !== 'planning')) && (
                        <div className={`${styles.phaseCard} ${phase === 'awaiting_approval' ? styles.phaseCardActive : ''}`}>
                            <div className={styles.phaseCardHeader} onClick={() => toggleCard('review')}>
                                <span className={styles.phaseIcon}>📋</span>
                                <span className={styles.phaseTitle}>Implementation Plan</span>
                                {phase === 'awaiting_approval' && <Zap size={14} style={{ color: '#fbbf24' }} />}
                                {phase !== 'awaiting_approval' && phase !== 'planning' && <CheckCircle2 size={14} style={{ color: '#4ade80' }} />}
                                <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('review') ? styles.phaseChevronOpen : ''}`} />
                            </div>
                            {!collapsedCards.has('review') && activePlan && (
                                <div className={styles.phaseBody}>
                                    {/* Plan Sections */}
                                    {PLAN_SECTIONS.map(s => {
                                        const content = renderPlanSectionContent(s.key);
                                        if (!content) return null;
                                        return (
                                            <div key={s.key} className={styles.planSection}>
                                                <div className={styles.planSectionHeader} onClick={() => togglePlanSection(s.key)}>
                                                    <span>{s.icon}</span>
                                                    <span style={{ flex: 1 }}>{s.label}</span>
                                                    <ChevronRight size={12} style={{
                                                        color: 'rgba(255,255,255,0.25)',
                                                        transform: expandedPlanSections.has(s.key) ? 'rotate(90deg)' : 'none',
                                                        transition: 'transform 0.2s'
                                                    }} />
                                                </div>
                                                {expandedPlanSections.has(s.key) && (
                                                    <div className={styles.planSectionBody}>
                                                        {content}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Inline Approval Buttons */}
                                    {phase === 'awaiting_approval' && (
                                        <>
                                            {approvalError && (
                                                <div style={{ padding: '0.5rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', fontSize: '0.75rem', color: '#f87171', marginTop: '0.5rem' }}>
                                                    ⚠️ {approvalError}
                                                </div>
                                            )}
                                            <div className={styles.approvalBar}>
                                                <button
                                                    className={styles.approveButton}
                                                    onClick={handleApprove}
                                                    disabled={approvalLoading}
                                                >
                                                    {approvalLoading ? <Loader2 size={14} className={styles.spin} /> : '✅ Approve & Build'}
                                                </button>
                                                <button
                                                    className={styles.reviseButton}
                                                    onClick={() => setShowRevisionInput(!showRevisionInput)}
                                                >
                                                    ✏️ Request Changes
                                                </button>
                                            </div>
                                            {showRevisionInput && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <textarea
                                                        className={styles.revisionInput}
                                                        value={revisionNotes}
                                                        onChange={e => setRevisionNotes(e.target.value)}
                                                        placeholder="Describe changes you'd like to the plan…"
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                        <button className={styles.reviseButton} onClick={handleRevise} disabled={!revisionNotes.trim() || approvalLoading}>
                                                            Submit Revision
                                                        </button>
                                                        <button className={styles.cancelButton} onClick={() => { setShowRevisionInput(false); setRevisionNotes(''); }}>
                                                            <X size={12} /> Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────
                        CARD 4: Execution Stream
                    ──────────────────────────────────────────────── */}
                    {(phase === 'building' || phase === 'deployed' || phase === 'error') && (
                        <div className={`${styles.phaseCard} ${phase === 'building' ? styles.phaseCardActive : ''}`}>
                            <div className={styles.phaseCardHeader} onClick={() => toggleCard('execution')}>
                                <span className={styles.phaseIcon}>⚙️</span>
                                <span className={styles.phaseTitle}>Execution Pipeline</span>
                                {phase === 'building' && <Loader2 size={14} className={styles.spin} style={{ color: '#60a5fa' }} />}
                                {phase === 'deployed' && <CheckCircle2 size={14} style={{ color: '#4ade80' }} />}
                                {phase === 'error' && <XCircle size={14} style={{ color: '#f87171' }} />}
                                <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('execution') ? styles.phaseChevronOpen : ''}`} />
                            </div>
                            {!collapsedCards.has('execution') && (
                                <div className={styles.phaseBody}>
                                    <div className={styles.logStream}>
                                        {(blueprint?.pipelineLogs || [])
                                            .filter(l => {
                                                const executionAgents = ['logic_builder', 'backend_generation', 'code_generation', 'qa_testing', 'debug_optimize', 'security', 'deployment', 'documentation', 'System'];
                                                const agentId = l.agentId || 'System';
                                                return executionAgents.includes(agentId) || !['nlii', 'nldi', 'vision', 'ui_designer', 'db_architect', 'system_architect', 'plan_coordinator'].includes(agentId);
                                            })
                                            .map((log, i) => (
                                                <div key={i} className={styles.logEntry}>
                                                    <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className={styles.logAgent}>{(log.agentId || 'system').replace(/_/g, ' ')}</span>
                                                    <div>
                                                        <span className={`${styles.logMsg} ${log.status === 'failed' ? styles.logMsgError : log.status === 'completed' ? styles.logMsgSuccess : ''}`}>
                                                            {log.message}
                                                        </span>
                                                        {log.payload?.toolCall && (
                                                            <div className={styles.logToolCall}>
                                                                {log.payload.toolCall.name}({JSON.stringify(log.payload.toolCall.arguments)})
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        {phase === 'building' && (
                                            <div className={styles.logEntry}>
                                                <span className={styles.logTime}></span>
                                                <span className={styles.logAgent}></span>
                                                <span className={styles.logMsg}><Loader2 size={12} className={styles.spin} /> Execution in progress…</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────
                        CARD 5: Generated Code
                    ──────────────────────────────────────────────── */}
                    {hasCode && (
                        <div className={styles.phaseCard}>
                            <div className={styles.phaseCardHeader} onClick={() => toggleCard('code')}>
                                <span className={styles.phaseIcon}>💻</span>
                                <span className={styles.phaseTitle}>Generated Code</span>
                                <span className={styles.phaseTimestamp}>{codeFiles.length} files</span>
                                <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('code') ? styles.phaseChevronOpen : ''}`} />
                            </div>
                            {!collapsedCards.has('code') && (
                                <div className={styles.phaseBody}>
                                    <div className={styles.codeFiles}>
                                        {codeFiles.map(file => (
                                            <div key={file.name} className={styles.codeFile}>
                                                <div className={styles.codeFileHeader} onClick={() => toggleFile(file.name)}>
                                                    <FileCode2 size={12} />
                                                    <span>{file.name}</span>
                                                    <span className={styles.codeFileSize}>{(file.content.length / 1024).toFixed(1)}KB</span>
                                                    <ChevronRight size={10} style={{
                                                        color: 'rgba(255,255,255,0.2)',
                                                        transform: expandedFiles.has(file.name) ? 'rotate(90deg)' : 'none',
                                                        transition: 'transform 0.2s'
                                                    }} />
                                                </div>
                                                {expandedFiles.has(file.name) && (
                                                    <pre className={styles.codeFileBody}>{file.content}</pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────
                        CARD 6: Deployment
                    ──────────────────────────────────────────────── */}
                    {phase === 'deployed' && (
                        <div className={styles.phaseCard}>
                            <div className={styles.phaseCardHeader} onClick={() => toggleCard('deploy')}>
                                <span className={styles.phaseIcon}>🚀</span>
                                <span className={styles.phaseTitle}>Deployment Complete</span>
                                <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
                                <ChevronRight size={14} className={`${styles.phaseChevron} ${!collapsedCards.has('deploy') ? styles.phaseChevronOpen : ''}`} />
                            </div>
                            {!collapsedCards.has('deploy') && (
                                <div className={styles.phaseBody}>
                                    <div className={styles.deploySuccess}>
                                        <span className={styles.deployIcon}>🎉</span>
                                        <div className={styles.deployInfo}>
                                            <div className={styles.deployTitle}>Your app is live!</div>
                                            <div className={styles.deploySub}>
                                                {blueprint?.github?.repoFullName && `GitHub: ${blueprint.github.repoFullName}`}
                                            </div>
                                        </div>
                                        {blueprint?.github?.repoUrl && (
                                            <a href={blueprint.github.repoUrl} target="_blank" rel="noopener noreferrer" className={styles.deployLink}>
                                                View on GitHub →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error state */}
                    {phase === 'error' && (
                        <div className={styles.phaseCard} style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
                            <div className={styles.phaseCardHeader}>
                                <span className={styles.phaseIcon}>⚠️</span>
                                <span className={styles.phaseTitle} style={{ color: '#f87171' }}>Pipeline Error</span>
                            </div>
                            <div className={styles.phaseBody}>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                                    The build pipeline encountered an error. Check the execution logs above for details.
                                </p>
                                <button className={styles.launchButton} style={{ marginTop: '0.75rem' }} onClick={() => { setProjectId(null); setBlueprint(null); setActivePlan(null); }}>
                                    Start Over
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
