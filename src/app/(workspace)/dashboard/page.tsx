'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import { useAuth } from '@/lib/auth/auth-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProjectBlueprint } from '@/lib/agents/types';

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
    building: { label: 'Building', icon: '⚡' },
    awaiting_approval: { label: 'Review Ready', icon: '📋' },
    awaiting_clarification: { label: 'Needs Input', icon: '⚠️' },
    deployed: { label: 'Live', icon: '🚀' },
    error: { label: 'Failed', icon: '✗' },
};

const PLATFORM_ICONS: Record<string, string> = {
    saas: '🏢',
    marketplace: '🛒',
    social: '👥',
    enterprise_dashboard: '📊',
    api_platform: '⚡',
    ai_agent: '🤖',
    single_app: '💡',
    multi_tenant: '🏗️',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<ProjectBlueprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            try {
                const q = query(
                    collection(db, 'projects'),
                    where('userId', '==', user.uid)
                );
                const snap = await getDocs(q);
                const fetched: ProjectBlueprint[] = [];
                snap.forEach(doc => fetched.push(doc.data() as ProjectBlueprint));
                fetched.sort((a, b) => b.createdAt - a.createdAt);
                setProjects(fetched);
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    }, [user]);

    const deployed = projects.filter(p => p.status === 'deployed').length;
    const building = projects.filter(p => p.status === 'building').length;

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <a href="/" className={styles.brand}>
                    <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                    <span className={styles.brandText}>Evolvable</span>
                </a>

                <nav className={styles.nav}>
                    {[
                        { href: '/dashboard', icon: '⬡', label: 'Dashboard', active: true },
                        { href: '/create', icon: '+', label: 'New Project' },
                        { href: '/builder', icon: '◈', label: 'Visual Builder' },
                        { href: '/settings', icon: '⚙', label: 'Settings' },
                    ].map(({ href, icon, label, active }) => (
                        <a
                            key={href}
                            href={href}
                            className={`${styles.navItem} ${active ? styles.active : ''}`}
                        >
                            <span className={styles.navIcon}>{icon}</span>
                            {label}
                        </a>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.healthIndicator}>
                        <div className={`${styles.healthDot} ${styles.healthy}`} />
                        All systems operational
                    </div>
                    {user && (
                        <div className={styles.userProfile}>
                            <div className={styles.userAvatar}>
                                {(user.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <span className={styles.userName}>{user.email}</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.headline}>Mission Control</h1>
                        <p className={styles.subheadline}>Your AI-generated applications workspace</p>
                    </div>
                    <a href="/create" className={styles.newProjectButton}>
                        <span>+</span> New Project
                    </a>
                </div>

                {/* Stats */}
                <div className={styles.statsStrip}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{projects.length}</span>
                        <span className={styles.statLabel}>Total Projects</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{deployed}</span>
                        <span className={styles.statLabel}>Deployed</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{building}</span>
                        <span className={styles.statLabel}>Active Builds</span>
                    </div>
                </div>

                {/* Projects */}
                <p className={styles.sectionTitle}>Generated Applications</p>

                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <span>Loading your projects...</span>
                    </div>
                ) : (
                    <div className={styles.projectsGrid}>
                        {projects.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>🚀</div>
                                <h3 className={styles.emptyTitle}>Nothing built yet</h3>
                                <p className={styles.emptySubtext}>
                                    Describe any app idea in plain English and watch Evolvable build it for you.
                                </p>
                                <a href="/create" className={styles.newProjectButton}>
                                    Start Vibe Coding →
                                </a>
                            </div>
                        ) : (
                            projects.map(project => {
                                const s = project.status || 'building';
                                const statusInfo = STATUS_LABELS[s] || { label: s, icon: '◌' };
                                const icon = PLATFORM_ICONS[project.prd?.platformMode || ''] || '💡';
                                const href = s === 'awaiting_approval'
                                    ? `/plan-review?projectId=${project.id}`
                                    : s === 'awaiting_clarification'
                                        ? `/plan-review?projectId=${project.id}`
                                        : `/builder?projectId=${project.id}`;

                                return (
                                    <a key={project.id} href={href} className={styles.projectCard}>
                                        <div className={styles.projectCardTop}>
                                            <div className={styles.projectCardIcon}>{icon}</div>
                                            <div className={`${styles.projectStatusPill} ${styles[s]}`}>
                                                <span className={styles.statusPing} />
                                                {statusInfo.icon} {statusInfo.label}
                                            </div>
                                        </div>
                                        <div className={styles.projectName}>
                                            {project.prd?.title || `Project ${project.id.substring(0, 8)}`}
                                        </div>
                                        <div className={styles.projectDescription}>
                                            {project.originalPrompt}
                                        </div>
                                        <div className={styles.projectMeta}>
                                            <span>{project.prd?.platformMode?.replace(/_/g, ' ') || 'Initializing...'}</span>
                                            <span>·</span>
                                            <span>{project.prd?.features?.length || 0} features</span>
                                        </div>
                                    </a>
                                );
                            })
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
