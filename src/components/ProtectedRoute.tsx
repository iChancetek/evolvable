'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { hasMinimumRole, type UserRole } from '@/lib/auth/roles';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Loading state — show skeleton
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--color-bg-light)',
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '4px solid rgba(66, 133, 244, 0.15)',
                    borderTopColor: 'var(--color-accent-blue)',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        );
    }

    // Not authenticated
    if (!user) return null;

    // Role check
    if (requiredRole && !hasMinimumRole(role, requiredRole)) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: '1rem',
                background: 'var(--color-bg-light)',
                fontFamily: 'var(--font-family)',
            }}>
                <span style={{ fontSize: '3rem' }}>🔒</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Access Restricted</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    You don&apos;t have permission to access this page.
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                        padding: '0.75rem 2rem',
                        borderRadius: '999px',
                        background: 'var(--color-text-primary)',
                        color: 'white',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
