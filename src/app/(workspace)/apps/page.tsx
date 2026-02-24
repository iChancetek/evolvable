'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProjectBlueprint } from '@/lib/agents/types';
import styles from './apps.module.css';
import {
    LayoutDashboard, Grid3x3, PlusCircle, Hammer, Settings, Search, Rocket,
    Zap, ClipboardCheck, AlertTriangle, XCircle, RefreshCw, Wrench,
    Building2, ShoppingCart, Users, BarChart3, Cpu, Bot, Lightbulb, Factory,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; glow: string; Icon: React.ComponentType<{ size?: number }>; badge: string }> = {
    building: { label: 'Building', color: '#60a5fa', glow: 'rgba(96,165,250,0.25)', Icon: Zap, badge: 'building' },
    awaiting_approval: { label: 'Review Ready', color: '#c084fc', glow: 'rgba(192,132,252,0.25)', Icon: ClipboardCheck, badge: 'awaiting_approval' },
    awaiting_clarification: { label: 'Needs Input', color: '#fbbf24', glow: 'rgba(251,191,36,0.25)', Icon: AlertTriangle, badge: 'awaiting_clarification' },
    deployed: { label: 'Live', color: '#4ade80', glow: 'rgba(74,222,128,0.25)', Icon: Rocket, badge: 'deployed' },
    error: { label: 'Failed', color: '#f87171', glow: 'rgba(248,113,113,0.25)', Icon: XCircle, badge: 'error' },
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    saas: Building2, marketplace: ShoppingCart, social: Users, enterprise_dashboard: BarChart3,
    api_platform: Cpu, ai_agent: Bot, single_app: Lightbulb, multi_tenant: Factory,
};

type TabFilter = 'all' | 'in_progress' | 'deployed' | 'needs_action';

function getCategory(status: string): TabFilter {
    if (status === 'deployed') return 'deployed';
    if (status === 'awaiting_approval' || status === 'awaiting_clarification') return 'needs_action';
    return 'in_progress';
}

function getAppHref(project: ProjectBlueprint): string {
    const s = project.status;
    if (s === 'awaiting_approval' || s === 'awaiting_clarification') return `/plan-review?projectId=${project.id}`;
    if (s === 'deployed') return `/builder?projectId=${project.id}`;
    return `/create?projectId=${project.id}`;
}

function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
}

export default function AppsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<ProjectBlueprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<TabFilter>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetch = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
                const snap = await getDocs(q);
                const data: ProjectBlueprint[] = [];
                snap.forEach(d => data.push(d.data() as ProjectBlueprint));
                data.sort((a, b) => b.createdAt - a.createdAt);
                setProjects(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [user]);

    const filtered = projects.filter(p => {
        const matchFilter = filter === 'all' || getCategory(p.status || 'building') === filter;
        const q = search.toLowerCase();
        const matchSearch = !q
            || p.prd?.title?.toLowerCase().includes(q)
            || p.originalPrompt?.toLowerCase().includes(q)
            || p.prd?.platformMode?.toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    const counts = {
        all: projects.length,
        in_progress: projects.filter(p => getCategory(p.status || 'building') === 'in_progress').length,
        needs_action: projects.filter(p => getCategory(p.status || 'building') === 'needs_action').length,
        deployed: projects.filter(p => (p.status || '') === 'deployed').length,
    };

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <a href="/dashboard" className={styles.brand}>
                    <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                    <span className={styles.brandText}>Evolvable</span>
                </a>

                <nav className={styles.nav}>
                    {[
                        { href: '/dashboard', icon: '⬡', label: 'Dashboard' },
                        { href: '/apps', icon: '▦', label: 'My Apps', active: true },
                        { href: '/create', icon: '+', label: 'New App' },
                        { href: '/builder', icon: '◈', label: 'Builder' },
                        { href: '/settings', icon: '⚙', label: 'Settings' },
                    ].map(({ href, icon, label, active }) => (
                        <a key={href} href={href} className={`${styles.navItem} ${active ? styles.active : ''}`}>
                            <span className={styles.navIcon}>{icon}</span>
                            {label}
                        </a>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {(user?.email?.[0] || 'U').toUpperCase()}
                        </div>
                        <span className={styles.userEmail}>{user?.email}</span>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.headline}>My Apps</h1>
                        <p className={styles.subheadline}>All your AI-generated applications — live, building, and in review</p>
                    </div>
                    <a href="/create" className={styles.newBtn}>
                        <span>+</span> Build New App
                    </a>
                </div>

                {/* Search + Filter */}
                <div className={styles.toolbar}>
                    <div className={styles.searchBar}>
                        <span className={styles.searchIcon}><Search size={14} /></span>
                        <input
                            className={styles.searchInput}
                            placeholder="Search apps..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className={styles.tabs}>
                        {([
                            ['all', 'All', counts.all],
                            ['in_progress', 'In Progress', counts.in_progress],
                            ['needs_action', 'Needs Action', counts.needs_action],
                            ['deployed', 'Deployed', counts.deployed],
                        ] as const).map(([id, label, count]) => (
                            <button
                                key={id}
                                className={`${styles.tab} ${filter === id ? styles.tabActive : ''}`}
                                onClick={() => setFilter(id)}
                            >
                                {label}
                                {count > 0 && <span className={styles.tabCount}>{count}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <span>Loading your apps...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>{search ? <Search size={36} /> : <Rocket size={36} />}</div>
                        <h3 className={styles.emptyTitle}>
                            {search ? 'No apps match your search' : filter === 'all' ? 'No apps yet' : `No ${filter.replace('_', ' ')} apps`}
                        </h3>
                        <p className={styles.emptyText}>
                            {!search && filter === 'all' && 'Describe your idea and Evolvable will build it for you.'}
                        </p>
                        {!search && filter === 'all' && (
                            <a href="/create" className={styles.newBtn} style={{ display: 'inline-flex', marginTop: '1.25rem' }}>
                                Start Building →
                            </a>
                        )}
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {filtered.map(project => {
                            const s = project.status || 'building';
                            const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.building;
                            const PlatIcon = PLATFORM_ICONS[project.prd?.platformMode || ''] || Lightbulb;
                            const href = getAppHref(project);
                            const age = project.createdAt ? timeAgo(project.createdAt) : '';

                            return (
                                <a key={project.id} href={href} className={styles.card} style={{ '--glow': cfg.glow } as React.CSSProperties}>
                                    {/* Card top */}
                                    <div className={styles.cardTop}>
                                        <div className={styles.cardIcon}><PlatIcon size={20} /></div>
                                        <div className={`${styles.statusBadge} ${styles[cfg.badge]}`}>
                                            <span className={styles.statusPing} />
                                            <cfg.Icon size={11} /> {cfg.label}
                                        </div>
                                    </div>

                                    {/* App name + description */}
                                    <div className={styles.cardName}>
                                        {project.prd?.title || `App ${project.id.substring(0, 8)}`}
                                    </div>
                                    <div className={styles.cardDesc}>
                                        {project.originalPrompt}
                                    </div>

                                    {/* Feature chip list */}
                                    {project.prd?.features && project.prd.features.length > 0 && (
                                        <div className={styles.featureChips}>
                                            {project.prd.features.slice(0, 3).map((f, i) => (
                                                <span key={i} className={styles.chip}>{f.title}</span>
                                            ))}
                                            {project.prd.features.length > 3 && (
                                                <span className={styles.chip}>+{project.prd.features.length - 3} more</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className={styles.cardMeta}>
                                        <span className={styles.metaPlatform}>
                                            {project.prd?.platformMode?.replace(/_/g, ' ') || 'Initializing...'}
                                        </span>
                                        <span className={styles.metaDot}>·</span>
                                        <span>{age}</span>
                                        {project.github?.repoFullName && (
                                            <>
                                                <span className={styles.metaDot}>·</span>
                                                <span style={{ color: '#4ade80' }}>⎇ {project.github.currentBranch || 'main'}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* CTA Hint */}
                                    <div className={styles.cardCta}>
                                        {s === 'awaiting_approval' && <><ClipboardCheck size={12} /> Review & Approve Plan →</>}
                                        {s === 'awaiting_clarification' && <><AlertTriangle size={12} /> Answer Questions →</>}
                                        {s === 'building' && <><Zap size={12} /> View Build Progress →</>}
                                        {s === 'deployed' && <><Wrench size={12} /> Open in Builder →</>}
                                        {s === 'error' && <><RefreshCw size={12} /> Retry Pipeline →</>}
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
