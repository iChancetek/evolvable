'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth/auth-context';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProjectBlueprint } from '@/lib/agents/types';

export default function DashboardPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<ProjectBlueprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [healthStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user) return;
            try {
                const projectsRef = collection(db, 'projects');
                const q = query(
                    projectsRef,
                    where('userId', '==', user.uid),
                    // Firestore requires a composite index for where + orderBy. 
                    // To avoid crash without index, we fetch and sort on client for MVP
                );

                const querySnapshot = await getDocs(q);
                const fetchedProjects: ProjectBlueprint[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedProjects.push(doc.data() as ProjectBlueprint);
                });

                // Sort by newest first
                fetchedProjects.sort((a, b) => b.createdAt - a.createdAt);

                setProjects(fetchedProjects);
            } catch (err) {
                console.error("Error fetching projects:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [user]);

    return (
        <ProtectedRoute>
            <div className={styles.page}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <a href="/" className={styles.brand}>
                        <div className={styles.logoMark}>E</div>
                        <span className={styles.brandText}>Evolvable</span>
                    </a>

                    <nav className={styles.nav}>
                        <a className={`${styles.navItem} ${styles.active}`}>
                            <span>📊</span> Dashboard
                        </a>
                        <a href="/builder" className={styles.navItem}>
                            <span>🎨</span> Builder
                        </a>
                        <a className={styles.navItem}>
                            <span>⚡</span> Automations
                        </a>
                        <a className={styles.navItem}>
                            <span>👥</span> Users
                        </a>
                        <a className={styles.navItem}>
                            <span>⚙️</span> Settings
                        </a>
                    </nav>

                    <div className={styles.sidebarFooter}>
                        <div className={styles.healthIndicator}>
                            <div className={`${styles.healthDot} ${styles[healthStatus]}`} />
                            <span>
                                {healthStatus === 'healthy' && 'All systems running'}
                                {healthStatus === 'degraded' && 'Slightly slower'}
                                {healthStatus === 'down' && 'Fixing issues...'}
                            </span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.content}>
                    <header className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Dashboard</h1>
                            <p className={styles.subtitle}>Your app at a glance</p>
                        </div>
                        <div className={styles.headerActions}>
                            <div className={styles.healthBadge}>
                                <div className={`${styles.healthDot} ${styles[healthStatus]}`} />
                                ✅ Your app is running perfectly
                            </div>
                        </div>
                    </header>

                    {/* Real Projects Grid */}
                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard} style={{ flex: 1 }}>
                            <div className={styles.chartHeader}>
                                <h3>Your Generated Applications</h3>
                                <a href="/create" className={styles.addAutoBtn}>+ New App</a>
                            </div>

                            {isLoading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>Loading projects...</div>
                            ) : projects.length === 0 ? (
                                <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏗️</div>
                                    <h3 style={{ marginBottom: '0.5rem' }}>No apps built yet</h3>
                                    <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>Describe an idea to the AI and watch it generate an entire application.</p>
                                    <a href="/create" className={styles.deployBtn}>Start Building</a>
                                </div>
                            ) : (
                                <div className={styles.autoList}>
                                    {projects.map((project, i) => (
                                        <div key={project.id} className={styles.autoItem}>
                                            <div className={styles.autoInfo}>
                                                <div className={styles.autoName}>{project.prd?.title || `Project ${project.id.substring(0, 6)}`}</div>
                                                <div className={styles.autoTrigger} style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {project.originalPrompt}
                                                </div>
                                            </div>
                                            <div className={styles.autoStats}>
                                                <span className={`${styles.autoStatus} ${project.status === 'deployed' ? styles.active : project.status === 'error' ? styles.paused : ''}`}>
                                                    {project.status === 'deployed' ? '✅ Live' : project.status === 'building' ? '🏗️ Building' : '⚠️ Failed'}
                                                </span>
                                                <a href={`/builder?projectId=${project.id}`} className={styles.previewBtn} style={{ marginLeft: '1rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                                                    Open Builder
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
