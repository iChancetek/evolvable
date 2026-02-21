import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './workspace.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { signOut, user } = useAuth();

    return (
        <ProtectedRoute>
            <div className={styles.ideLayout}>
                {/* Global Left Sidebar (Activity Bar) */}
                <aside className={styles.activityBar}>
                    <div className={styles.topIcons}>
                        <Link href="/" className={styles.homeIcon} title="Home">
                            E
                        </Link>

                        <div className={styles.activityIcons}>
                            <Link href="/create" className={`${styles.actIcon} ${pathname.startsWith('/create') ? styles.actIconActive : ''}`} title="Create App">
                                💡
                            </Link>
                            <Link href="/dashboard" className={`${styles.actIcon} ${pathname.startsWith('/dashboard') ? styles.actIconActive : ''}`} title="Dashboard">
                                📊
                            </Link>
                            <Link href="/builder" className={`${styles.actIcon} ${pathname.startsWith('/builder') ? styles.actIconActive : ''}`} title="Visual Builder">
                                🛠️
                            </Link>
                        </div>
                    </div>

                    <div className={styles.bottomIcons}>
                        <Link href="/settings" className={`${styles.actIcon} ${pathname.startsWith('/settings') ? styles.actIconActive : ''}`} title="Settings">
                            ⚙️
                        </Link>
                        <div onClick={signOut} className={styles.actIcon} title="Sign Out" style={{ cursor: 'pointer' }}>
                            🚪
                        </div>
                    </div>
                </aside>

                {/* Main Content Area (Contextual Sidebar + Editor Pane) */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {children}
                </div>
            </div>
        </ProtectedRoute>
    );
}
