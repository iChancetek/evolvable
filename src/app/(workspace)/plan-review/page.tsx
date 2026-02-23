'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProjectBlueprint, ImplementationPlan, PlanVersion } from '@/lib/agents/types';
import styles from './plan-review.module.css';
import Link from 'next/link';

type Section = 'executive' | 'architecture' | 'features' | 'database' | 'security' | 'deployment' | 'testing' | 'monitoring' | 'risks' | 'infrastructure' | 'domain_hosting';

const SECTIONS: { key: Section; label: string; icon: string }[] = [
    { key: 'executive', label: 'Executive Summary', icon: '📋' },
    { key: 'architecture', label: 'Architecture Overview', icon: '🏗️' },
    { key: 'features', label: 'Feature Breakdown', icon: '⚙️' },
    { key: 'database', label: 'Database Design', icon: '🗄️' },
    { key: 'security', label: 'Security Plan', icon: '🔐' },
    { key: 'deployment', label: 'Deployment Strategy', icon: '🚀' },
    { key: 'testing', label: 'Testing Plan', icon: '🧪' },
    { key: 'monitoring', label: 'Monitoring Plan', icon: '📊' },
    { key: 'risks', label: 'Risk Analysis', icon: '⚠️' },
    { key: 'infrastructure', label: 'Infrastructure Setup', icon: '☁️' },
    { key: 'domain_hosting', label: 'Domain & Hosting', icon: '🌐' },
];

const COMPLEXITY_COLORS: Record<string, string> = {
    low: '#22c55e', medium: '#f59e0b', high: '#ef4444', enterprise: '#8b5cf6'
};

export default function PlanReviewPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [user, setUser] = useState<User | null>(null);
    const [project, setProject] = useState<ProjectBlueprint | null>(null);
    const [activePlan, setActivePlan] = useState<ImplementationPlan | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['executive']));
    const [revisionNotes, setRevisionNotes] = useState('');
    const [clarificationNotes, setClarificationNotes] = useState('');
    const [showRevisionInput, setShowRevisionInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeHistoryVersion, setActiveHistoryVersion] = useState<number | null>(null);

    // Auth
    useEffect(() => {
        return onAuthStateChanged(auth, u => {
            if (!u) router.push('/login');
            else setUser(u);
        });
    }, [router]);

    // Live project subscription
    useEffect(() => {
        if (!projectId) return;
        const ref = doc(db, 'projects', projectId);
        return onSnapshot(ref, snap => {
            if (snap.exists()) {
                const data = snap.data() as ProjectBlueprint;
                setProject(data);
                // Show active plan version
                const plan = data.planVersions?.find(v => v.version === data.activePlanVersion);
                setActivePlan(plan?.plan || null);
                setActiveHistoryVersion(data.activePlanVersion);
            }
        });
    }, [projectId]);

    const toggleSection = (key: Section) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const handleApprove = useCallback(async () => {
        if (!user || !project || !activePlan) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/orchestrate/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, userId: user.uid, planVersion: project.activePlanVersion })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/create?projectId=${projectId}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, project, activePlan, projectId, router]);

    const handleRevise = useCallback(async () => {
        if (!user || !project || !revisionNotes.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/orchestrate/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, userId: user.uid, revisionNotes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRevisionNotes('');
            setShowRevisionInput(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, project, revisionNotes, projectId]);

    const handleClarify = useCallback(async () => {
        if (!user || !project || !clarificationNotes.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/orchestrate/clarify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, userId: user.uid, clarificationNotes })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/create?projectId=${projectId}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, project, clarificationNotes, projectId, router]);

    const handleCancel = useCallback(async () => {
        router.push('/dashboard');
    }, [router]);

    const viewVersion = (v: PlanVersion) => {
        setActivePlan(v.plan);
        setActiveHistoryVersion(v.version);
    };

    if (!project) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading project...</p>
            </div>
        );
    }

    if (!activePlan && project.status !== 'awaiting_clarification') {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading implementation plan...</p>
            </div>
        );
    }

    const isRevisionInProgress = project.status === 'building' && project.phase === 'planning';
    const isLatestVersion = activePlan ? activeHistoryVersion === project.activePlanVersion : true;

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <Link href="/dashboard" className={styles.backLink}>← Dashboard</Link>

                {activePlan ? (
                    <>
                        <div className={styles.planMeta}>
                            <div className={styles.planTitle}>Implementation Plan</div>
                            <div className={styles.planBadge} style={{ background: COMPLEXITY_COLORS[activePlan.executiveSummary.estimatedComplexity] + '22', color: COMPLEXITY_COLORS[activePlan.executiveSummary.estimatedComplexity], border: `1px solid ${COMPLEXITY_COLORS[activePlan.executiveSummary.estimatedComplexity]}44` }}>
                                {activePlan.executiveSummary.estimatedComplexity?.toUpperCase()} COMPLEXITY
                            </div>
                            <div className={styles.planStat}>
                                <span>🕐</span> {activePlan.executiveSummary.estimatedBuildTime}
                            </div>
                            <div className={styles.planStat}>
                                <span>🏷️</span> {activePlan.executiveSummary.appType?.replace(/_/g, ' ')}
                            </div>
                            <div className={styles.planStat}>
                                <span>💰</span> {activePlan.executiveSummary.monetizationModel?.replace(/_/g, ' ')}
                            </div>
                        </div>

                        <div className={styles.sectionNav}>
                            {SECTIONS.map(s => (
                                <button
                                    key={s.key}
                                    className={`${styles.navItem} ${expandedSections.has(s.key) ? styles.navItemActive : ''}`}
                                    onClick={() => toggleSection(s.key)}
                                >
                                    {s.icon} {s.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.planMeta}>
                        <div className={styles.planTitle}>Project Setup</div>
                        <div className={styles.planStat}>
                            <span>⚠️</span> Awaiting Clarification
                        </div>
                    </div>
                )}

                {/* Version History */}
                {(project.planVersions?.length || 0) > 1 && (
                    <div className={styles.versionHistory}>
                        <div className={styles.versionTitle}>Version History</div>
                        {[...(project.planVersions || [])].reverse().map(v => (
                            <button
                                key={v.version}
                                className={`${styles.versionItem} ${activeHistoryVersion === v.version ? styles.versionActive : ''}`}
                                onClick={() => viewVersion(v)}
                            >
                                <span>v{v.version}</span>
                                <span className={styles.versionStatus}>{v.plan.status}</span>
                                {v.approvedAt && <span className={styles.versionCheck}>✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {activePlan ? (
                    <>
                        {/* Header */}
                        <div className={styles.header}>
                            <div>
                                <h1 className={styles.headline}>
                                    {activePlan.executiveSummary.appType === 'saas' ? '🏢' :
                                        activePlan.executiveSummary.appType === 'marketplace' ? '🛍️' :
                                            activePlan.executiveSummary.appType === 'social' ? '👥' : '⚡'} Plan v{activeHistoryVersion}
                                    {!isLatestVersion && <span className={styles.oldVersionBadge}> — Historical View</span>}
                                </h1>
                                <p className={styles.subheadline}>Review your implementation plan before building begins</p>
                            </div>

                            {/* Validation Status */}
                            <div className={styles.validationRow}>
                                {Object.entries(activePlan.selfValidation || {}).map(([key, val]) => (
                                    <div key={key} className={`${styles.validChip} ${val ? styles.validPass : styles.validFail}`}>
                                        {val ? '✅' : '❌'} {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plan Sections */}
                        <div className={styles.sections}>

                            {/* Executive Summary */}
                            {expandedSections.has('executive') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>📋 Executive Summary</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Target Users</div>
                                            <ul className={styles.list}>{activePlan.executiveSummary.targetUsers?.map((u, i) => <li key={i}>{u}</li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Core Features</div>
                                            <ul className={styles.list}>{activePlan.executiveSummary.coreFeatures?.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Architecture */}
                            {expandedSections.has('architecture') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🏗️ Architecture Overview</h2>
                                    <div className={styles.grid2}>
                                        {Object.entries(activePlan.architectureOverview || {}).filter(([k]) => k !== 'multiTenantStrategy').map(([key, val]) => (
                                            <div key={key} className={styles.card}>
                                                <div className={styles.cardLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                <div className={styles.cardValue}>{String(val)}</div>
                                            </div>
                                        ))}
                                        {activePlan.architectureOverview?.multiTenantStrategy && (
                                            <div className={styles.card}>
                                                <div className={styles.cardLabel}>Multi-tenant Strategy</div>
                                                <div className={`${styles.cardValue} ${styles.highlight}`}>{activePlan.architectureOverview.multiTenantStrategy}</div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Feature Breakdown */}
                            {expandedSections.has('features') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>⚙️ Feature Breakdown</h2>
                                    <div className={styles.grid3}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Pages ({activePlan.featureBreakdown?.pages?.length || 0})</div>
                                            <ul className={styles.list}>{activePlan.featureBreakdown?.pages?.map((p, i) => <li key={i}><code>{p.path}</code> — {p.purpose} <span className={styles.roles}>{p.roles?.join(', ')}</span></li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>API Endpoints ({activePlan.featureBreakdown?.apis?.length || 0})</div>
                                            <ul className={styles.list}>{activePlan.featureBreakdown?.apis?.map((a, i) => <li key={i}><code>{a.method} {a.path}</code> {a.auth && '🔒'}</li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>User Roles</div>
                                            <ul className={styles.list}>{activePlan.featureBreakdown?.userRoles?.map((r, i) => <li key={i}>👤 {r}</li>)}</ul>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Database */}
                            {expandedSections.has('database') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🗄️ Database Design</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Data Models ({activePlan.databaseDesign?.models?.length || 0})</div>
                                            <ul className={styles.list}>{activePlan.databaseDesign?.models?.map((m, i) => <li key={i}><strong>{m.name}</strong>{m.tenantScoped && ' 🏢'}</li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Index Strategy</div>
                                            <ul className={styles.list}>{activePlan.databaseDesign?.indexStrategy?.map((idx, i) => <li key={i}>{idx}</li>)}</ul>
                                        </div>
                                    </div>
                                    {activePlan.databaseDesign?.isolationLogic && (
                                        <div className={`${styles.card} ${styles.isolationCard}`}>
                                            <div className={styles.cardLabel}>🏢 Tenant Isolation Logic</div>
                                            <p>{activePlan.databaseDesign.isolationLogic}</p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Security */}
                            {expandedSections.has('security') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🔐 Security Plan</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Auth Flow</div>
                                            <p>{activePlan.securityPlan?.authFlow}</p>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Route Protection ({activePlan.securityPlan?.routeProtection?.length || 0} routes)</div>
                                            <ul className={styles.list}>{activePlan.securityPlan?.routeProtection?.map((r, i) => <li key={i}>🔒 {r}</li>)}</ul>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Deployment */}
                            {expandedSections.has('deployment') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🚀 Deployment Strategy</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Hosting</div><p>{activePlan.deploymentStrategy?.hosting}</p>
                                            <div className={styles.cardLabel} style={{ marginTop: '12px' }}>Scaling</div><p>{activePlan.deploymentStrategy?.scalingModel}</p>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Environment Variables</div>
                                            <ul className={styles.list}>{activePlan.deploymentStrategy?.envVars?.map((v, i) => <li key={i}><code>{v}</code></li>)}</ul>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Testing */}
                            {expandedSections.has('testing') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🧪 Testing Plan</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>RBAC Matrix ({activePlan.testingPlan?.rbacMatrix?.length || 0} combinations)</div>
                                            <ul className={styles.list}>{activePlan.testingPlan?.rbacMatrix?.slice(0, 8).map((r, i) => <li key={i}>{r.role} × {r.route} → {r.allowed ? '✅' : '🚫'}</li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Auth Flow Tests</div>
                                            <ul className={styles.list}>{activePlan.testingPlan?.authFlowTests?.map((t, i) => <li key={i}>{t}</li>)}</ul>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Monitoring */}
                            {expandedSections.has('monitoring') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>📊 Monitoring Plan</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Metrics</div>
                                            <ul className={styles.list}>{activePlan.monitoringPlan?.metrics?.map((m, i) => <li key={i}>{m}</li>)}</ul>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Error Logging</div><p>{activePlan.monitoringPlan?.errorLogging}</p>
                                            <div className={styles.cardLabel} style={{ marginTop: '12px' }}>Performance</div><p>{activePlan.monitoringPlan?.performanceTracking}</p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Risks */}
                            {expandedSections.has('risks') && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>⚠️ Risk Analysis</h2>
                                    <div className={styles.riskList}>
                                        {[
                                            ...(activePlan.riskAnalysis?.technicalRisks || []),
                                            ...(activePlan.riskAnalysis?.securityRisks || []),
                                            ...(activePlan.riskAnalysis?.scalabilityRisks || [])
                                        ].map((r, i) => (
                                            <div key={i} className={`${styles.riskItem} ${styles[`risk_${r.severity}`]}`}>
                                                <div className={styles.riskHeader}>
                                                    <span className={styles.riskSeverity}>{r.severity?.toUpperCase()}</span>
                                                    <span>{r.risk}</span>
                                                </div>
                                                <p className={styles.riskMitigation}>🛡️ {r.mitigation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Infrastructure (NLII) */}
                            {expandedSections.has('infrastructure') && activePlan.nliiSummary && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>☁️ Infrastructure Setup</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Identified Environment</div>
                                            <p><strong>Cloud:</strong> {activePlan.nliiSummary.identifiedCloud.toUpperCase()}</p>
                                            <p><strong>OS:</strong> {activePlan.nliiSummary.identifiedOS.toUpperCase()}</p>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Required Tooling</div>
                                            <ul className={styles.list}>
                                                {activePlan.nliiSummary.identifiedTooling?.map((tool, i) => (
                                                    <li key={i}>{tool}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {activePlan.nliiSummary.assumptionsMade?.length > 0 && (
                                        <div className={`${styles.card} ${styles.isolationCard}`} style={{ marginTop: '16px' }}>
                                            <div className={styles.cardLabel}>🧠 AI Assumptions</div>
                                            <ul className={styles.list}>
                                                {activePlan.nliiSummary.assumptionsMade.map((asm, i) => (
                                                    <li key={i}>{asm}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className={styles.grid2} style={{ marginTop: '16px' }}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Estimated Cost Tier</div>
                                            <p>{activePlan.nliiSummary.estimatedCostTier.replace(/_/g, ' ').toUpperCase()}</p>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Risk Level</div>
                                            <p style={{ color: COMPLEXITY_COLORS[activePlan.nliiSummary.riskLevel] || '#fff' }}>
                                                {activePlan.nliiSummary.riskLevel.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Domain & Hosting (NLDI) */}
                            {expandedSections.has('domain_hosting') && activePlan.nldiSummary && (
                                <section className={styles.section}>
                                    <h2 className={styles.sectionTitle}>🌐 Domain & Hosting Strategy</h2>
                                    <div className={styles.grid2}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Target Provider</div>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                                                {activePlan.nldiSummary.provider.toUpperCase()}
                                            </p>
                                            <div style={{ marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                                                <strong>Region:</strong> {activePlan.nldiSummary.region}
                                            </div>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Custom Domain Intent</div>
                                            <p>
                                                {activePlan.nldiSummary.domainIntent === 'buy' ? '💸 Register New Domain' :
                                                    activePlan.nldiSummary.domainIntent === 'connect' ? '🔗 Connect Existing Domain' :
                                                        '⚡ Use Platform Subdomain'}
                                            </p>
                                            {activePlan.nldiSummary.domainName && (
                                                <div style={{ marginTop: '8px', fontWeight: 600, color: 'var(--color-primary)' }}>
                                                    {activePlan.nldiSummary.domainName}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.grid2} style={{ marginTop: '16px' }}>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Scalability & Performance</div>
                                            <p>📈 {activePlan.nldiSummary.scaling}</p>
                                        </div>
                                        <div className={styles.card}>
                                            <div className={styles.cardLabel}>Budget Sentiment</div>
                                            <p>💰 {activePlan.nldiSummary.budget}</p>
                                        </div>
                                    </div>

                                    <div className={`${styles.card}`} style={{ marginTop: '16px', background: 'var(--color-surface-hover)' }}>
                                        <div className={styles.cardLabel}>Security & SSL</div>
                                        <p>🔒 <strong>Enterprise-grade SSL</strong> will be {activePlan.nldiSummary.sslStatus.replace('_', ' ')} for all traffic.</p>
                                    </div>
                                </section>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.header}>
                        <h1 className={styles.headline}>⚠️ Setup Clarification Required</h1>
                        <p className={styles.subheadline}>The AI Agents need a few more details before they can design the architecture plan.</p>
                    </div>
                )}

                {/* Action Bar */}
                {isLatestVersion && (
                    <div className={styles.actionBar}>
                        {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

                        {isRevisionInProgress ? (
                            <div className={styles.revisionInProgress}>
                                <div className={styles.spinner} />
                                <span>AI agents are generating a revised plan...</span>
                            </div>
                        ) : showRevisionInput ? (
                            <div className={styles.revisionBox}>
                                <textarea
                                    className={styles.revisionInput}
                                    placeholder="Describe what you'd like changed (e.g., 'Add a mobile app, switch to PostgreSQL, add a referral system')"
                                    value={revisionNotes}
                                    onChange={e => setRevisionNotes(e.target.value)}
                                    rows={3}
                                />
                                <div className={styles.revisionActions}>
                                    <button className={styles.btnSecondary} onClick={() => setShowRevisionInput(false)}>Cancel</button>
                                    <button className={styles.btnRevise} onClick={handleRevise} disabled={loading || !revisionNotes.trim()}>
                                        {loading ? 'Submitting...' : '🔄 Submit Revision'}
                                    </button>
                                </div>
                            </div>
                        ) : project.phase === 'awaiting_clarification' ? (
                            <div className={styles.revisionBox}>
                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ color: 'var(--color-error)' }}>⚠️ The AI needs more details:</strong>
                                    <ul style={{ marginTop: '8px', paddingLeft: '20px', color: 'var(--color-text-secondary)' }}>
                                        {project.infrastructure?.nliiSummary?.clarificationsNeeded?.map((q, i) => (
                                            <li key={`nlii-${i}`}>{q}</li>
                                        ))}
                                        {project.nldiSummary?.clarificationsNeeded?.map((q, i) => (
                                            <li key={`nldi-${i}`}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                                <textarea
                                    className={styles.revisionInput}
                                    placeholder="Answer the questions above so the AI can continue building..."
                                    value={clarificationNotes}
                                    onChange={e => setClarificationNotes(e.target.value)}
                                    rows={3}
                                />
                                <div className={styles.revisionActions}>
                                    <button className={styles.btnSecondary} onClick={handleCancel}>Cancel</button>
                                    <button className={styles.btnRevise} onClick={handleClarify} disabled={loading || !clarificationNotes.trim()}>
                                        {loading ? 'Submitting...' : 'Send Clarification →'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.actions}>
                                <button className={styles.btnCancel} onClick={handleCancel}>✕ Cancel</button>
                                <button className={styles.btnRevise} onClick={() => setShowRevisionInput(true)}>
                                    ✏️ Request Revision
                                </button>
                                <button className={styles.btnApprove} onClick={handleApprove} disabled={loading}>
                                    {loading ? 'Starting...' : '✅ Approve & Build'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
