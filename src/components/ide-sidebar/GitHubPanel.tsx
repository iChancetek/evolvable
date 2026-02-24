'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
    Github, ExternalLink, Shield, CheckCircle2, AlertCircle,
    LinkIcon, Unlink, Loader2, Webhook,
} from 'lucide-react';

interface GitHubInfo {
    connected: boolean;
    githubAccount: {
        githubLogin: string;
        avatarUrl: string;
        connectedAt: number;
        scope: string;
    } | null;
    repo: {
        fullName: string;
        url: string;
    } | null;
}

interface GitHubPanelProps {
    projectId: string | null;
}

export function GitHubPanel({ projectId }: GitHubPanelProps) {
    const { user } = useAuth();
    const [info, setInfo] = useState<GitHubInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetchInfo = async () => {
        if (!user || !projectId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/github/repo?userId=${user.uid}&projectId=${projectId}`);
            const data = await res.json();
            setInfo({
                connected: data.connected || false,
                githubAccount: data.githubAccount || null,
                repo: data.repo || null,
            });
        } catch {
            setInfo({ connected: false, githubAccount: null, repo: null });
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!user || !confirm('Are you sure? This will revoke the stored GitHub token.')) return;
        setDisconnecting(true);
        try {
            await fetch('/api/github/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid }),
            });
            setInfo({ connected: false, githubAccount: null, repo: null });
        } catch (err) {
            console.error(err);
        } finally {
            setDisconnecting(false);
        }
    };

    useEffect(() => { fetchInfo(); }, [user, projectId]);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.75rem' }}>Loading GitHub status...</div>
            </div>
        );
    }

    if (!info?.connected) {
        return (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <Github size={36} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                    GitHub Not Connected
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    Connect your GitHub account to enable source control, CI/CD, and repository management.
                </div>
                <a
                    href="/settings/github"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        fontSize: '0.75rem', fontWeight: 600, color: '#fff', textDecoration: 'none',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <Github size={14} /> Connect GitHub
                </a>
            </div>
        );
    }

    const account = info.githubAccount;
    const connectedDate = account?.connectedAt ? new Date(account.connectedAt).toLocaleDateString() : 'Unknown';

    const row = (icon: React.ReactNode, label: string, value: React.ReactNode, color = 'rgba(255,255,255,0.7)'): React.ReactNode => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5rem 0.625rem', background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px', marginBottom: '0.375rem',
        }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color }}>{value}</div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '0.625rem 0.75rem' }}>
            {/* Account Card */}
            {account && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '0.75rem',
                }}>
                    <img src={account.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)' }} />
                    <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{account.githubLogin}</div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Connected {connectedDate}</div>
                    </div>
                    <CheckCircle2 size={16} style={{ color: '#4ade80', marginLeft: 'auto' }} />
                </div>
            )}

            {/* Info rows */}
            {row(<Shield size={13} />, 'Token Health', <><CheckCircle2 size={10} style={{ color: '#4ade80' }} /> Active</>, '#4ade80')}
            {row(<Webhook size={13} />, 'Scopes', account?.scope || 'repo', 'rgba(255,255,255,0.5)')}

            {info.repo && (
                <>
                    {row(
                        <LinkIcon size={13} />,
                        'Linked Repository',
                        <a href={info.repo.url} target="_blank" rel="noopener noreferrer" style={{ color: '#79c0ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {info.repo.fullName} <ExternalLink size={10} />
                        </a>,
                        '#79c0ff'
                    )}
                </>
            )}

            {!info.repo && row(<AlertCircle size={13} />, 'Repository', 'No repo linked yet', '#fbbf24')}

            {/* Disconnect */}
            <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                    width: '100%', padding: '0.5rem', marginTop: '0.75rem',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                    color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    opacity: disconnecting ? 0.5 : 1,
                }}
            >
                {disconnecting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Unlink size={13} />}
                Disconnect GitHub
            </button>
        </div>
    );
}
