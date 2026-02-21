'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './login.module.css';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, resetPassword, error, clearError, user, loading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showReset, setShowReset] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Already authenticated — redirect
    if (!loading && user) {
        router.push('/create');
        return null;
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setSubmitting(true);
        await signInWithEmail(email, password);
        setSubmitting(false);
    };

    const handleGoogleLogin = async () => {
        setSubmitting(true);
        await signInWithGoogle();
        setSubmitting(false);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setSubmitting(true);
        await resetPassword(email);
        setResetSent(true);
        setSubmitting(false);
    };

    return (
        <div className={styles.page}>
            {/* Background particles */}
            <div className={styles.bgOrb1} />
            <div className={styles.bgOrb2} />

            <div className={styles.card}>
                {/* Logo */}
                <a href="/" className={styles.brand}>
                    <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                    <span>Evolvable</span>
                </a>

                {showReset ? (
                    <>
                        <h1 className={styles.title}>Reset Password</h1>
                        <p className={styles.subtitle}>
                            {resetSent
                                ? 'Check your email for a reset link ✉️'
                                : "Enter your email and we'll send you a reset link."}
                        </p>

                        {!resetSent && (
                            <form onSubmit={handleReset} className={styles.form}>
                                <div className={styles.field}>
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); clearError(); }}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                                {error && <div className={styles.error}>{error}</div>}
                                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                                    {submitting ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        )}

                        <button className={styles.switchLink} onClick={() => { setShowReset(false); setResetSent(false); clearError(); }}>
                            ← Back to login
                        </button>
                    </>
                ) : (
                    <>
                        <h1 className={styles.title}>Welcome back</h1>
                        <p className={styles.subtitle}>Sign in to continue building amazing apps</p>

                        {/* Google Sign-In */}
                        <button className={styles.googleBtn} onClick={handleGoogleLogin} disabled={submitting}>
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className={styles.divider}>
                            <span>or</span>
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailLogin} className={styles.form}>
                            <div className={styles.field}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {error && <div className={styles.error}>{error}</div>}

                            <button type="submit" className={styles.submitBtn} disabled={submitting}>
                                {submitting ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <button className={styles.forgotLink} onClick={() => { setShowReset(true); clearError(); }}>
                            Forgot password?
                        </button>

                        <div className={styles.footer}>
                            Don&apos;t have an account?{' '}
                            <a href="/signup" className={styles.signupLink}>Create one</a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
