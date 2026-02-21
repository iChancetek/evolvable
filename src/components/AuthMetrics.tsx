'use client';

import { useEffect, useState } from 'react';
import { getAllUsers, type UserProfile } from '@/lib/firebase/user-service';

interface AuthMetricsData {
    totalUsers: number;
    newSignups: number; // last 7 days
    googleUsers: number;
    emailUsers: number;
}

export default function AuthMetrics() {
    const [metrics, setMetrics] = useState<AuthMetricsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const users = await getAllUsers(500);
                const now = Date.now();
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

                const newSignups = users.filter((u: UserProfile) => {
                    const created = u.createdAt as { seconds?: number } | undefined;
                    return created?.seconds && created.seconds * 1000 > sevenDaysAgo;
                }).length;

                const googleUsers = users.filter((u: UserProfile) => u.provider === 'google.com').length;
                const emailUsers = users.filter((u: UserProfile) => u.provider === 'password').length;

                setMetrics({
                    totalUsers: users.length,
                    newSignups,
                    googleUsers,
                    emailUsers,
                });
            } catch {
                // Silently fail — dashboard still works without metrics
                setMetrics({ totalUsers: 0, newSignups: 0, googleUsers: 0, emailUsers: 0 });
            }
            setLoading(false);
        }
        fetchMetrics();
    }, []);

    if (loading || !metrics) {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.25rem',
            }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '1.5rem',
                        border: '1px solid rgba(0,0,0,0.04)',
                        height: 120,
                        animation: 'glow-pulse 2s infinite',
                    }} />
                ))}
            </div>
        );
    }

    const cards = [
        { icon: '👥', value: metrics.totalUsers.toString(), label: 'Total Users', color: '#4285f4' },
        { icon: '🆕', value: metrics.newSignups.toString(), label: 'New This Week', color: '#22c55e' },
        { icon: '🔵', value: metrics.googleUsers.toString(), label: 'Google Users', color: '#a855f7' },
        { icon: '✉️', value: metrics.emailUsers.toString(), label: 'Email Users', color: '#06b6d4' },
    ];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem',
        }}>
            {cards.map((card, i) => (
                <div key={i} style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '1.5rem',
                    border: '1px solid rgba(0,0,0,0.04)',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>{card.icon}</div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        marginBottom: '4px',
                    }}>{card.value}</div>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#5f6368',
                    }}>{card.label}</div>
                </div>
            ))}
        </div>
    );
}
