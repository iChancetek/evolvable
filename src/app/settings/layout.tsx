import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './settings.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { signOut, user } = useAuth();

    const navigation = [
        { name: 'Profile', href: '/settings', icon: '👤' },
        { name: 'Usage', href: '/settings/usage', icon: '📊' },
        { name: 'Databases', href: '/settings/databases', icon: '🗄️' },
        { name: 'Codebase', href: '/settings/code', icon: '💻' },
        { name: 'Publish', href: '/settings/publish', icon: '🚀' },
    ];

    return (
        <ProtectedRoute>
            <div className={styles.ideLayout}>
                {/* Left Sidebar (Activity Bar) */}
                <aside className={styles.activityBar}>
                    <div className={styles.topIcons}>
                        <Link href="/" className={styles.homeIcon} title="Home">
                            E
                        </Link>
                    </div>
                </aside>

                {/* Primary Side Bar (Navigation) */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>WORKSPACE</h2>
                    </div>
                    <nav className={styles.navTree}>
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className={styles.sidebarFooter}>
                        <div className={styles.userInfo}>
                            <span className={styles.userEmail}>{user?.email || 'Guest'}</span>
                        </div>
                        <button onClick={signOut} className={styles.logoutBtn}>
                            <span className={styles.navIcon}>🚪</span> Sign Off
                        </button>
                    </div>
                </div>

                {/* Main Content Area (Editor Pane) */}
                <main className={styles.editorPane}>
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
