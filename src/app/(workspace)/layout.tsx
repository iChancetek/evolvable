'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './workspace.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { signOut, user } = useAuth();
    const [aiHealth, setAiHealth] = useState<'healthy' | 'degraded' | 'checking'>('checking');
    const [aiMessage, setAiMessage] = useState<string>('Checking AI status...');

    useEffect(() => {
        let mounted = true;

        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health/ai');
                if (!mounted) return;

                if (res.ok) {
                    setAiHealth('healthy');
                    setAiMessage('AI Systems Online');
                } else {
                    const data = await res.json();
                    setAiHealth('degraded');
                    setAiMessage(data.message || 'AI Warming Up...');
                }
            } catch (err) {
                if (mounted) {
                    setAiHealth('degraded');
                    setAiMessage('AI Service Unreachable');
                }
            }
        };

        // Initial check
        checkHealth();

        // Poll every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

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
                        {/* AI Health Indicator (Invisible when healthy to reduce clutter) */}
                        {aiHealth !== 'healthy' && (
                            <div
                                className={styles.actIcon}
                                title={aiMessage}
                                style={{
                                    cursor: 'help',
                                    opacity: 1,
                                    filter: aiHealth === 'degraded' ? 'drop-shadow(0 0 4px rgba(255, 165, 0, 0.8))' : 'none'
                                }}
                            >
                                {aiHealth === 'degraded' ? '🟡' : '🔄'}
                            </div>
                        )}

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
