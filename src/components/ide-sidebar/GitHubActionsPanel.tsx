'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
    RefreshCw, CheckCircle2, XCircle, Clock, Play, Loader2,
    AlertCircle, ExternalLink, GitCommitHorizontal,
} from 'lucide-react';

interface WorkflowRun {
    id: number;
    name: string;
    status: 'completed' | 'in_progress' | 'queued' | 'failure' | 'cancelled';
    conclusion: string | null;
    headSha: string;
    createdAt: string;
    htmlUrl: string;
    runNumber: number;
}

interface GitHubActionsPanelProps {
    projectId: string | null;
    repoFullName?: string;
}

const STATUS_ICONS: Record<string, { Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
    completed: { Icon: CheckCircle2, color: '#4ade80' },
    success: { Icon: CheckCircle2, color: '#4ade80' },
    in_progress: { Icon: Loader2, color: '#60a5fa' },
    queued: { Icon: Clock, color: '#fbbf24' },
    failure: { Icon: XCircle, color: '#f87171' },
    cancelled: { Icon: XCircle, color: 'rgba(255,255,255,0.3)' },
};

export function GitHubActionsPanel({ projectId, repoFullName }: GitHubActionsPanelProps) {
    const { user } = useAuth();
    const [runs, setRuns] = useState<WorkflowRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rerunning, setRerunning] = useState<number | null>(null);

    const fetchRuns = async () => {
        if (!user || !projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/github/actions?userId=${user.uid}&projectId=${projectId}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to fetch'); return; }
            setRuns(data.runs || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const rerunWorkflow = async (runId: number) => {
        if (!user) return;
        setRerunning(runId);
        try {
            await fetch(`/api/github/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, projectId, runId }),
            });
            // Refetch after re-run
            setTimeout(fetchRuns, 2000);
        } catch (err) {
            console.error('Re-run failed:', err);
        } finally {
            setRerunning(null);
        }
    };

    useEffect(() => { fetchRuns(); }, [user, projectId]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem' }}>Loading workflow runs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <AlertCircle size={28} style={{ color: '#f87171', marginBottom: '0.75rem', opacity: 0.6 }} />
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>{error}</div>
                <button onClick={fetchRuns} style={{
                    padding: '0.4rem 0.875rem', background: 'rgba(66,133,244,0.08)',
                    border: '1px solid rgba(66,133,244,0.2)', borderRadius: '6px',
                    fontSize: '0.7rem', color: '#79c0ff', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '0' }}>
            {/* Header with refresh */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Workflow Runs ({runs.length})
                </span>
                <button onClick={fetchRuns} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '2px' }}>
                    <RefreshCw size={12} />
                </button>
            </div>

            {runs.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
                    No workflow runs found.
                    <br />
                    <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Push code to trigger CI/CD</span>
                </div>
            ) : (
                <div style={{ padding: '0.5rem 0.75rem' }}>
                    {runs.map(run => {
                        const statusKey = run.conclusion || run.status;
                        const { Icon: StatusIcon, color } = STATUS_ICONS[statusKey] || STATUS_ICONS.queued;
                        const isInProgress = run.status === 'in_progress' || run.status === 'queued';

                        return (
                            <div
                                key={run.id}
                                style={{
                                    padding: '0.5rem 0.625rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '6px',
                                    marginBottom: '0.375rem',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <StatusIcon
                                        size={14}
                                        style={{
                                            color,
                                            flexShrink: 0,
                                            animation: isInProgress ? 'spin 1s linear infinite' : 'none',
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600,
                                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {run.name}
                                    </span>
                                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>#{run.runNumber}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>
                                    <GitCommitHorizontal size={10} />
                                    <span style={{ fontFamily: 'monospace' }}>{run.headSha.substring(0, 7)}</span>
                                    <span>·</span>
                                    <span>{new Date(run.createdAt).toLocaleDateString()}</span>

                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                                        {!isInProgress && (
                                            <button
                                                onClick={() => rerunWorkflow(run.id)}
                                                disabled={rerunning === run.id}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'rgba(255,255,255,0.25)', padding: '2px',
                                                }}
                                                title="Re-run workflow"
                                            >
                                                {rerunning === run.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
                                            </button>
                                        )}
                                        <a
                                            href={run.htmlUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'rgba(255,255,255,0.25)', padding: '2px' }}
                                            title="Open in GitHub"
                                        >
                                            <ExternalLink size={11} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
