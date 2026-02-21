'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './github.module.css';

interface GitHubAccount {
    githubLogin: string;
    avatarUrl: string;
    connectedAt: number;
}

interface CommitEntry {
    sha: string;
    message: string;
    authorName: string;
    date: string;
}

interface PullRequest {
    number: number;
    title: string;
    state: string;
    url: string;
    head: string;
}

interface RepoData {
    fullName: string;
    url: string;
    currentBranch: string;
    openPrNumber?: number;
    openPrUrl?: string;
    mergedAt?: number;
    pullRequests: PullRequest[];
    commits: CommitEntry[];
    branches: { name: string; sha: string }[];
}

interface GitHubState {
    connected: boolean;
    githubAccount: GitHubAccount | null;
    repo: RepoData | null;
}

// Human-readable version labels — no git terminology
const VERSION_LABELS: Record<string, string> = {
    'feature/plan-v1': 'Version 1',
    'feature/plan-v2': 'Version 2',
    'feature/plan-v3': 'Version 3',
    'main': 'Published Version',
};
function friendlyBranch(b: string) {
    return VERSION_LABELS[b] || b.replace(/feature\/plan-v/, 'Version ').replace(/hotfix\/rollback-v/, 'Restored Version ');
}
function friendlyDate(iso: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export default function GitHubSettingsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();

    const [state, setState] = useState<GitHubState>({ connected: false, githubAccount: null, repo: null });
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showRollbackPicker, setShowRollbackPicker] = useState(false);

    // Handle OAuth callback status
    useEffect(() => {
        const connected = searchParams.get('connected');
        const err = searchParams.get('error');
        if (connected) setSuccess('You\'re all set! Your projects will now be saved automatically.');
        if (err) setError(`We couldn\'t connect your account. Please try again. (${err.replace(/_/g, ' ')})`);
    }, [searchParams]);

    const fetchGitHubState = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/github/repo?userId=${user.uid}&projectId=default`);
            const data = await res.json();
            setState({
                connected: data.connected || false,
                githubAccount: data.githubAccount || null,
                repo: data.repo || null
            });
        } catch (err) {
            console.error('Failed to load GitHub state:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchGitHubState(); }, [fetchGitHubState]);

    const handleConnect = () => {
        if (!user) return;
        setConnecting(true);
        window.location.href = `/api/github/connect?userId=${user.uid}`;
    };

    const handleDisconnect = async () => {
        if (!user || !window.confirm('Remove GitHub connection? Your projects will no longer be saved automatically.')) return;
        setActionLoading('disconnect');
        setError(null);
        try {
            const res = await fetch('/api/github/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess('GitHub disconnected.');
            setState({ connected: false, githubAccount: null, repo: null });
        } catch (err: any) { setError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleMergePR = async () => {
        if (!user || !state.repo?.openPrNumber) return;
        setActionLoading('merge');
        setError(null);
        try {
            const res = await fetch('/api/github/pr/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, projectId: 'default', prNumber: state.repo.openPrNumber })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess('Changes published! Your app is ready to deploy.');
            await fetchGitHubState();
        } catch (err: any) { setError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleRollback = async (commitEntry: CommitEntry, versionIndex: number) => {
        if (!user || !state.repo) return;
        setActionLoading('rollback');
        setError(null);
        try {
            const res = await fetch('/api/github/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, projectId: 'default', commitSha: commitEntry.sha, version: versionIndex })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(`Restoring to a previous version... We'll let you know when it's ready for review.`);
            setShowRollbackPicker(false);
            await fetchGitHubState();
        } catch (err: any) { setError(err.message); }
        finally { setActionLoading(null); }
    };

    if (loading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner} />
                <p>Loading your GitHub connection...</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>

                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerIcon}>🐙</div>
                    <div>
                        <h1 className={styles.title}>Version Control</h1>
                        <p className={styles.subtitle}>
                            Every time your app is built, we automatically save your project and ask you to review before publishing.
                        </p>
                    </div>
                </div>

                {/* Status banners */}
                {success && (
                    <div className={styles.successBanner}>
                        ✅ {success}
                        <button className={styles.bannerClose} onClick={() => setSuccess(null)}>✕</button>
                    </div>
                )}
                {error && (
                    <div className={styles.errorBanner}>
                        ⚠️ {error}
                        <button className={styles.bannerClose} onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* ── NOT CONNECTED ── */}
                {!state.connected && (
                    <div className={styles.connectCard}>

                        {/* Hero graphic */}
                        <div className={styles.connectHero}>
                            <div className={styles.connectHeroBadge}>🐙</div>
                            <div className={styles.connectHeroText}>
                                <div className={styles.connectHeroTitle}>Back up your work automatically</div>
                                <div className={styles.connectHeroSub}>Never lose what you build</div>
                            </div>
                        </div>

                        {/* What happens — 3 steps */}
                        <div className={styles.connectSteps}>
                            <div className={styles.connectStep}>
                                <div className={styles.stepNum}>1</div>
                                <div className={styles.stepContent}>
                                    <div className={styles.stepTitle}>Click the button below</div>
                                    <div className={styles.stepDesc}>A GitHub window will open. If you're already signed in, it takes one click.</div>
                                </div>
                            </div>
                            <div className={styles.stepConnector} />
                            <div className={styles.connectStep}>
                                <div className={styles.stepNum}>2</div>
                                <div className={styles.stepContent}>
                                    <div className={styles.stepTitle}>Say yes to save your projects</div>
                                    <div className={styles.stepDesc}>GitHub will ask if Evolvable can save files on your behalf. Just click "Authorize".</div>
                                </div>
                            </div>
                            <div className={styles.stepConnector} />
                            <div className={styles.connectStep}>
                                <div className={styles.stepNum}>3</div>
                                <div className={styles.stepContent}>
                                    <div className={styles.stepTitle}>You're done — we handle everything else</div>
                                    <div className={styles.stepDesc}>Every app you build gets saved automatically. No technical knowledge needed.</div>
                                </div>
                            </div>
                        </div>

                        {/* Primary CTA */}
                        <button
                            className={styles.btnConnect}
                            onClick={handleConnect}
                            disabled={connecting}
                        >
                            {connecting ? (
                                <><span className={styles.btnSpinner} /> Opening GitHub...</>
                            ) : (
                                <>
                                    <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                                    </svg>
                                    Connect with GitHub
                                </>
                            )}
                        </button>

                        {/* Privacy mini-disclosure */}
                        <div className={styles.connectPrivacy}>
                            <div className={styles.privacyRow}>
                                <span className={styles.privacyIcon}>🔒</span>
                                <span>We only access your own projects — nothing else on your account.</span>
                            </div>
                            <div className={styles.privacyRow}>
                                <span className={styles.privacyIcon}>🚫</span>
                                <span>We never read your emails, contacts, or other repositories.</span>
                            </div>
                            <div className={styles.privacyRow}>
                                <span className={styles.privacyIcon}>✂️</span>
                                <span>You can disconnect anytime from this page.</span>
                            </div>
                        </div>

                        {/* Social proof */}
                        <div className={styles.connectFootnote}>
                            This is the same way apps like Vercel, Netlify, and Figma connect to GitHub.
                        </div>

                    </div>
                )}

                {/* ── CONNECTED ── */}
                {state.connected && (
                    <div className={styles.connectedLayout}>

                        {/* Account card */}
                        <div className={styles.accountCard}>
                            {state.githubAccount?.avatarUrl && (
                                <img
                                    src={state.githubAccount.avatarUrl}
                                    alt={state.githubAccount.githubLogin}
                                    className={styles.avatar}
                                />
                            )}
                            <div className={styles.accountInfo}>
                                <div className={styles.accountLogin}>@{state.githubAccount?.githubLogin}</div>
                                <div className={styles.accountMeta}>
                                    Connected {state.githubAccount?.connectedAt
                                        ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(state.githubAccount.connectedAt))
                                        : ''}
                                </div>
                            </div>
                            <button
                                className={styles.btnDisconnect}
                                onClick={handleDisconnect}
                                disabled={actionLoading === 'disconnect'}
                            >
                                {actionLoading === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        </div>

                        {/* ── No repo yet ── */}
                        {!state.repo && (
                            <div className={styles.emptyRepo}>
                                <div className={styles.emptyIcon}>📦</div>
                                <h3>No project linked yet</h3>
                                <p>Build your first app and we'll save it here automatically.</p>
                            </div>
                        )}

                        {/* ── Repo panel ── */}
                        {state.repo && (
                            <>
                                {/* Review banner — shown when PR is open */}
                                {state.repo.openPrNumber && !state.repo.mergedAt && (
                                    <div className={styles.reviewBanner}>
                                        <div className={styles.reviewBannerLeft}>
                                            <span className={styles.reviewDot} />
                                            <div>
                                                <div className={styles.reviewTitle}>Your app is ready for review</div>
                                                <div className={styles.reviewSub}>
                                                    The AI built your app. Review the changes and publish when you're happy.
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.reviewActions}>
                                            <a
                                                href={state.repo.openPrUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.btnViewChanges}
                                            >
                                                View Changes ↗
                                            </a>
                                            <button
                                                className={styles.btnPublish}
                                                onClick={handleMergePR}
                                                disabled={actionLoading === 'merge'}
                                            >
                                                {actionLoading === 'merge' ? 'Publishing...' : '✅ Publish App'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Published banner */}
                                {state.repo.mergedAt && (
                                    <div className={styles.publishedBanner}>
                                        🎉 Published on {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(state.repo.mergedAt))}
                                    </div>
                                )}

                                {/* Project info */}
                                <div className={styles.repoInfo}>
                                    <div className={styles.repoInfoItem}>
                                        <div className={styles.repoLabel}>Project saved to</div>
                                        <a href={state.repo.url} target="_blank" rel="noopener noreferrer" className={styles.repoLink}>
                                            {state.repo.fullName} ↗
                                        </a>
                                    </div>
                                    <div className={styles.repoInfoItem}>
                                        <div className={styles.repoLabel}>Current version</div>
                                        <div className={styles.repoValue}>{friendlyBranch(state.repo.currentBranch)}</div>
                                    </div>
                                </div>

                                {/* Version history */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <h3 className={styles.sectionTitle}>Version History</h3>
                                        <button
                                            className={styles.btnRestore}
                                            onClick={() => setShowRollbackPicker(v => !v)}
                                        >
                                            🔄 Restore a Previous Version
                                        </button>
                                    </div>

                                    {showRollbackPicker && (
                                        <div className={styles.rollbackPicker}>
                                            <p className={styles.rollbackHint}>
                                                Select a version below to restore. We'll create a preview for you to review before anything changes.
                                            </p>
                                            {state.repo.commits.map((c, i) => (
                                                <div key={c.sha} className={styles.rollbackItem}>
                                                    <div className={styles.rollbackInfo}>
                                                        <div className={styles.rollbackLabel}>{c.message.substring(0, 60)}</div>
                                                        <div className={styles.rollbackMeta}>{c.authorName} · {friendlyDate(c.date)}</div>
                                                    </div>
                                                    <button
                                                        className={styles.btnRollbackItem}
                                                        onClick={() => handleRollback(c, i + 1)}
                                                        disabled={actionLoading === 'rollback'}
                                                    >
                                                        {actionLoading === 'rollback' ? '...' : 'Restore'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className={styles.commitList}>
                                        {state.repo.commits.map((c) => (
                                            <div key={c.sha} className={styles.commitItem}>
                                                <div className={styles.commitDot} />
                                                <div className={styles.commitContent}>
                                                    <div className={styles.commitMsg}>{c.message}</div>
                                                    <div className={styles.commitMeta}>{c.authorName} · {friendlyDate(c.date)}</div>
                                                </div>
                                                <div className={styles.commitSha}>{c.sha}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Open versions */}
                                {state.repo.pullRequests.filter(p => p.state === 'open').length > 0 && (
                                    <div className={styles.section}>
                                        <h3 className={styles.sectionTitle}>Pending Reviews</h3>
                                        {state.repo.pullRequests.filter(p => p.state === 'open').map(pr => (
                                            <div key={pr.number} className={styles.prItem}>
                                                <div className={styles.prDot} />
                                                <div className={styles.prContent}>
                                                    <div className={styles.prTitle}>{friendlyBranch(pr.head)} → needs review</div>
                                                    <div className={styles.prMeta}>Waiting for your approval</div>
                                                </div>
                                                <a href={pr.url} target="_blank" rel="noopener noreferrer" className={styles.btnViewPr}>
                                                    Review ↗
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
