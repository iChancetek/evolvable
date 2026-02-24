'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
    GitBranch, GitCommitHorizontal, GitPullRequest, ExternalLink,
    RefreshCw, History, ArrowUpRight, AlertCircle, Loader2,
} from 'lucide-react';

interface RepoData {
    fullName: string;
    url: string;
    currentBranch: string;
    openPrNumber?: number;
    openPrUrl?: string;
    latestCommitSha?: string;
    mergedAt?: number;
    branches: { name: string; sha: string }[];
    pullRequests: { number: number; title: string; state: string; url: string; head: string; base: string }[];
    commits: { sha: string; message: string; authorName: string; date: string }[];
}

interface GitHubAccount {
    githubLogin: string;
    avatarUrl: string;
}

interface SourceControlPanelProps {
    projectId: string | null;
}

const cellStyle: React.CSSProperties = {
    padding: '0.5rem 0.625rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '6px',
    marginBottom: '0.375rem',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: '0.15rem',
};

const valueStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
};

export function SourceControlPanel({ projectId }: SourceControlPanelProps) {
    const { user } = useAuth();
    const [repo, setRepo] = useState<RepoData | null>(null);
    const [account, setAccount] = useState<GitHubAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'overview' | 'commits' | 'branches' | 'prs'>('overview');

    const fetchData = async () => {
        if (!user || !projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/github/repo?userId=${user.uid}&projectId=${projectId}`);
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Failed to fetch'); return; }
            if (data.repo) setRepo(data.repo);
            if (data.githubAccount) setAccount(data.githubAccount);
            if (!data.repo) setError(data.message || 'No repository linked');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user, projectId]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem' }}>Loading source control...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <AlertCircle size={28} style={{ color: '#f87171', marginBottom: '0.75rem', opacity: 0.6 }} />
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>{error}</div>
                <a
                    href="/settings/github"
                    style={{
                        display: 'inline-block', padding: '0.4rem 0.875rem',
                        background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)',
                        borderRadius: '6px', fontSize: '0.7rem', color: '#79c0ff', textDecoration: 'none',
                    }}
                >
                    Connect GitHub in Settings →
                </a>
            </div>
        );
    }

    if (!repo) return null;

    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '0.375rem',
        fontSize: '0.65rem',
        fontWeight: 600,
        color: active ? '#79c0ff' : 'rgba(255,255,255,0.3)',
        background: active ? 'rgba(66,133,244,0.1)' : 'none',
        border: 'none',
        borderBottom: active ? '2px solid #4285f4' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
    });

    return (
        <div style={{ padding: '0' }}>
            {/* Account header */}
            {account && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <img src={account.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{account.githubLogin}</span>
                    <button onClick={fetchData} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '2px' }}>
                        <RefreshCw size={12} />
                    </button>
                </div>
            )}

            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button style={tabBtnStyle(tab === 'overview')} onClick={() => setTab('overview')}>Overview</button>
                <button style={tabBtnStyle(tab === 'commits')} onClick={() => setTab('commits')}>Commits</button>
                <button style={tabBtnStyle(tab === 'branches')} onClick={() => setTab('branches')}>Branches</button>
                <button style={tabBtnStyle(tab === 'prs')} onClick={() => setTab('prs')}>PRs</button>
            </div>

            <div style={{ padding: '0.625rem 0.75rem', overflowY: 'auto' }}>
                {tab === 'overview' && (
                    <>
                        <div style={cellStyle}>
                            <div style={labelStyle}>Repository</div>
                            <div style={{ ...valueStyle, color: '#79c0ff', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <GitBranch size={12} /> {repo.fullName}
                                <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: '#79c0ff', marginLeft: 'auto' }}>
                                    <ExternalLink size={11} />
                                </a>
                            </div>
                        </div>
                        <div style={cellStyle}>
                            <div style={labelStyle}>Branch</div>
                            <div style={{ ...valueStyle, color: '#4ade80' }}>{repo.currentBranch || 'main'}</div>
                        </div>
                        <div style={cellStyle}>
                            <div style={labelStyle}>Latest Commit</div>
                            <div style={{ ...valueStyle, color: '#fbbf24' }}>{(repo.latestCommitSha || '—').substring(0, 7)}</div>
                        </div>
                        {repo.openPrUrl && (
                            <a
                                href={repo.openPrUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 0.625rem', marginTop: '0.375rem',
                                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                                    borderRadius: '6px', fontSize: '0.72rem', color: '#c084fc', textDecoration: 'none',
                                }}
                            >
                                <GitPullRequest size={13} /> Open PR #{repo.openPrNumber} <ArrowUpRight size={11} style={{ marginLeft: 'auto' }} />
                            </a>
                        )}
                    </>
                )}

                {tab === 'commits' && (
                    <div>
                        {repo.commits.length === 0 ? (
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '1rem' }}>No commits found</div>
                        ) : (
                            repo.commits.slice(0, 15).map((c, i) => (
                                <div key={i} style={{ ...cellStyle, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <GitCommitHorizontal size={13} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.message}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                                            {c.sha.substring(0, 7)} · {c.authorName} · {new Date(c.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === 'branches' && (
                    <div>
                        {repo.branches.map((b, i) => (
                            <div key={i} style={{ ...cellStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GitBranch size={13} style={{ color: b.name === repo.currentBranch ? '#4ade80' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.72rem', color: b.name === repo.currentBranch ? '#4ade80' : 'rgba(255,255,255,0.5)', fontWeight: b.name === repo.currentBranch ? 600 : 400 }}>
                                    {b.name}
                                </span>
                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                                    {b.sha.substring(0, 7)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'prs' && (
                    <div>
                        {repo.pullRequests.length === 0 ? (
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '1rem' }}>No pull requests</div>
                        ) : (
                            repo.pullRequests.map((pr, i) => (
                                <a
                                    key={i}
                                    href={pr.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ ...cellStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', cursor: 'pointer' }}
                                >
                                    <GitPullRequest size={13} style={{ color: pr.state === 'open' ? '#4ade80' : '#c084fc', flexShrink: 0 }} />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            #{pr.number} {pr.title}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{pr.head} → {pr.base}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px', borderRadius: '9999px',
                                        background: pr.state === 'open' ? 'rgba(74,222,128,0.1)' : 'rgba(192,132,252,0.1)',
                                        color: pr.state === 'open' ? '#4ade80' : '#c084fc',
                                    }}>
                                        {pr.state}
                                    </span>
                                </a>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
