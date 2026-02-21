'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from '@/app/(workspace)/workspace.module.css';

export default function SettingsSidebarLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const navigation = [
        { name: 'Profile', href: '/settings', icon: '👤' },
        { name: 'Usage', href: '/settings/usage', icon: '📊' },
        { name: 'Databases', href: '/settings/databases', icon: '🗄️' },
        { name: 'Codebase', href: '/settings/code', icon: '💻' },
        { name: 'Version Control', href: '/settings/github', icon: '🐙' },
        { name: 'Publish', href: '/settings/publish', icon: '🚀' },
    ];

    return (
        <>
            {/* Primary Side Bar (Navigation) */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2>SETTINGS</h2>
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
                </div>
            </div>

            {/* Main Content Area (Editor Pane) */}
            <main className={styles.editorPane}>
                {children}
            </main>
        </>
    );
}
