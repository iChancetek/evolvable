'use client';

import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';

const metrics = [
    { label: 'Total Users', value: '2,847', trend: '+12.5%', trendUp: true, icon: '👤' },
    { label: 'Active Today', value: '342', trend: '+8.2%', trendUp: true, icon: '📈' },
    { label: 'Revenue', value: '$14,230', trend: '+23.1%', trendUp: true, icon: '💰' },
    { label: 'Form Submissions', value: '89', trend: '-2.4%', trendUp: false, icon: '📋' },
];

const automations = [
    { name: 'Welcome Email', trigger: 'New user signs up', status: 'active', runs: 847 },
    { name: 'Booking Confirmation', trigger: 'Booking confirmed', status: 'active', runs: 423 },
    { name: 'Weekly Summary', trigger: 'Every Monday 9am', status: 'active', runs: 52 },
    { name: 'Abandoned Cart', trigger: 'Cart idle 1 hour', status: 'paused', runs: 156 },
];

const topPages = [
    { name: 'Homepage', views: 4821 },
    { name: 'Book Now', views: 2134 },
    { name: 'Pricing', views: 1567 },
    { name: 'About Us', views: 892 },
    { name: 'Contact', views: 634 },
];

export default function DashboardPage() {
    const [healthStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
    const [trafficData, setTrafficData] = useState<number[]>([]);

    useEffect(() => {
        // Simulate traffic data
        const data = Array.from({ length: 24 }, () => Math.floor(Math.random() * 150 + 50));
        setTrafficData(data);
    }, []);

    const maxTraffic = Math.max(...trafficData, 1);

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

                    {/* Metric Cards */}
                    <div className={styles.metricsGrid}>
                        {metrics.map((m, i) => (
                            <div key={i} className={styles.metricCard}>
                                <div className={styles.metricTop}>
                                    <span className={styles.metricIcon}>{m.icon}</span>
                                    <span className={`${styles.metricTrend} ${m.trendUp ? styles.trendUp : styles.trendDown}`}>
                                        {m.trendUp ? '↑' : '↓'} {m.trend}
                                    </span>
                                </div>
                                <div className={styles.metricValue}>{m.value}</div>
                                <div className={styles.metricLabel}>{m.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className={styles.chartsRow}>
                        {/* Traffic Chart */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3>Traffic Today</h3>
                                <span className={styles.chartMeta}>Visitors by hour</span>
                            </div>
                            <div className={styles.chart}>
                                {trafficData.map((val, i) => (
                                    <div
                                        key={i}
                                        className={styles.chartBar}
                                        style={{ height: `${(val / maxTraffic) * 100}%` }}
                                        title={`${i}:00 — ${val} visitors`}
                                    />
                                ))}
                            </div>
                            <div className={styles.chartLabels}>
                                <span>12am</span>
                                <span>6am</span>
                                <span>12pm</span>
                                <span>6pm</span>
                                <span>Now</span>
                            </div>
                        </div>

                        {/* Top Pages */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3>Top Pages</h3>
                                <span className={styles.chartMeta}>Most visited</span>
                            </div>
                            <div className={styles.pagesList}>
                                {topPages.map((page, i) => (
                                    <div key={i} className={styles.pageRow}>
                                        <div className={styles.pageInfo}>
                                            <span className={styles.pageRank}>{i + 1}</span>
                                            <span className={styles.pageName}>{page.name}</span>
                                        </div>
                                        <div className={styles.pageViews}>
                                            <div className={styles.pageBar}>
                                                <div
                                                    className={styles.pageBarFill}
                                                    style={{ width: `${(page.views / topPages[0].views) * 100}%` }}
                                                />
                                            </div>
                                            <span>{page.views.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Automations */}
                    <div className={styles.automationsCard}>
                        <div className={styles.chartHeader}>
                            <h3>⚡ Active Automations</h3>
                            <button className={styles.addAutoBtn}>+ Add Automation</button>
                        </div>
                        <div className={styles.autoList}>
                            {automations.map((auto, i) => (
                                <div key={i} className={styles.autoItem}>
                                    <div className={styles.autoInfo}>
                                        <div className={styles.autoName}>{auto.name}</div>
                                        <div className={styles.autoTrigger}>When: {auto.trigger}</div>
                                    </div>
                                    <div className={styles.autoStats}>
                                        <span className={styles.autoRuns}>{auto.runs} runs</span>
                                        <span className={`${styles.autoStatus} ${styles[auto.status]}`}>
                                            {auto.status === 'active' ? '✅ Active' : '⏸️ Paused'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
