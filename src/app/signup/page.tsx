'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import styles from './signup.module.css';

export default function SignupPage() {
    const { signUpWithEmail, signInWithGoogle, error, clearError, user, loading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!loading && user) {
        router.push('/create');
        return null;
    }

    const validatePassword = (pw: string): string | null => {
        if (pw.length < 6) return 'Password must be at least 6 characters.';
        if (!/[A-Z]/.test(pw)) return 'Include at least one uppercase letter.';
        if (!/[0-9]/.test(pw)) return 'Include at least one number.';
        return null;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (password !== confirmPassword) {
            setLocalError('Passwords don\'t match.');
            return;
        }

        const pwError = validatePassword(password);
        if (pwError) {
            setLocalError(pwError);
            return;
        }

        setSubmitting(true);
        await signUpWithEmail(email, password);
        setSubmitting(false);
    };

    const handleGoogleSignup = async () => {
        setSubmitting(true);
        await signInWithGoogle();
        setSubmitting(false);
    };

    const displayError = localError || error;

    return (
        <div className={styles.page}>
            <div className={styles.bgOrb1} />
            <div className={styles.bgOrb2} />

            <div className={styles.card}>
                <a href="/" className={styles.brand}>
                    <div className={styles.logoMark}>E</div>
                    <span>Evolvable</span>
                </a>

                <h1 className={styles.title}>Create your account</h1>
                <p className={styles.subtitle}>Start building amazing apps in minutes</p>

                <button className={styles.googleBtn} onClick={handleGoogleSignup} disabled={submitting}>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className={styles.divider}><span>or</span></div>

                <form onSubmit={handleSignup} className={styles.form}>
                    <div className={styles.field}>
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(''); }}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); clearError(); setLocalError(''); }}
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(''); }}
                            placeholder="Re-enter password"
                            required
                            minLength={6}
                        />
                    </div>

                    {displayError && <div className={styles.error}>{displayError}</div>}

                    <div className={styles.requirements}>
                        <span className={password.length >= 6 ? styles.met : ''}>✓ 6+ characters</span>
                        <span className={/[A-Z]/.test(password) ? styles.met : ''}>✓ Uppercase letter</span>
                        <span className={/[0-9]/.test(password) ? styles.met : ''}>✓ Number</span>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={submitting}>
                        {submitting ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className={styles.footer}>
                    Already have an account?{' '}
                    <a href="/login" className={styles.loginLink}>Sign in</a>
                </div>
            </div>
        </div>
    );
}
