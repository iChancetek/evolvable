'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './workspace.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    Lightbulb,
    LayoutDashboard,
    Hammer,
    Settings,
    LogOut,
    AlertCircle,
    Loader2,
} from 'lucide-react';

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

        checkHealth();
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
                                <Lightbulb size={18} />
                            </Link>
                            <Link href="/dashboard" className={`${styles.actIcon} ${pathname.startsWith('/dashboard') ? styles.actIconActive : ''}`} title="Dashboard">
                                <LayoutDashboard size={18} />
                            </Link>
                            <Link href="/builder" className={`${styles.actIcon} ${pathname.startsWith('/builder') ? styles.actIconActive : ''}`} title="Visual Builder">
                                <Hammer size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className={styles.bottomIcons}>
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
                                {aiHealth === 'degraded' ? <AlertCircle size={18} /> : <Loader2 size={18} className={styles.spinning} />}
                            </div>
                        )}

                        <Link href="/settings" className={`${styles.actIcon} ${pathname.startsWith('/settings') ? styles.actIconActive : ''}`} title="Settings">
                            <Settings size={18} />
                        </Link>
                        <div onClick={signOut} className={styles.actIcon} title="Sign Out" style={{ cursor: 'pointer' }}>
                            <LogOut size={18} />
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {children}
                </div>
            </div>
        </ProtectedRoute>
    );
}
