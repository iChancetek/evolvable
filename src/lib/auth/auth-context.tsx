'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuthAdapter, type AuthUser } from '@/lib/auth/auth-adapter';
import { type UserRole, getDefaultRole } from '@/lib/auth/roles';
import { createUserProfile, getUserProfile } from '@/lib/firebase/user-service';

interface AuthContextType {
    user: AuthUser | null;
    role: UserRole;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [role, setRole] = useState<UserRole>('end-user');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const adapter = getAuthAdapter();

    useEffect(() => {
        const unsubscribe = adapter.onAuthStateChanged(async (authUser) => {
            setUser(authUser);
            if (authUser) {
                try {
                    const profile = await getUserProfile(authUser.uid);
                    setRole(profile?.role || getDefaultRole());
                } catch {
                    setRole(getDefaultRole());
                }
            } else {
                setRole('end-user');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [adapter]);

    const handleError = (err: unknown) => {
        const message = err instanceof Error ? err.message : 'An error occurred';
        // Clean up Firebase error messages for non-technical users
        if (message.includes('auth/invalid-credential')) {
            setError('Invalid email or password. Please try again.');
        } else if (message.includes('auth/email-already-in-use')) {
            setError('An account with this email already exists. Try logging in instead.');
        } else if (message.includes('auth/weak-password')) {
            setError('Password must be at least 6 characters long.');
        } else if (message.includes('auth/popup-closed-by-user')) {
            setError(null); // User cancelled, not an error
        } else if (message.includes('auth/too-many-requests')) {
            setError('Too many attempts. Please wait a moment and try again.');
        } else {
            setError(message);
        }
    };

    const signInWithGoogle = async () => {
        setError(null);
        try {
            const authUser = await adapter.signInWithGoogle();
            // Ensure profile exists
            const existing = await getUserProfile(authUser.uid);
            if (!existing) {
                await createUserProfile(authUser.uid, {
                    email: authUser.email,
                    displayName: authUser.displayName,
                    photoURL: authUser.photoURL,
                    provider: 'google.com',
                    role: getDefaultRole(),
                });
            }
        } catch (err) {
            handleError(err);
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        setError(null);
        try {
            await adapter.signInWithEmail(email, password);
        } catch (err) {
            handleError(err);
        }
    };

    const signUpWithEmail = async (email: string, password: string) => {
        setError(null);
        try {
            const authUser = await adapter.signUpWithEmail(email, password);
            await createUserProfile(authUser.uid, {
                email: authUser.email,
                displayName: null,
                photoURL: null,
                provider: 'password',
                role: getDefaultRole(),
            });
        } catch (err) {
            handleError(err);
        }
    };

    const signOut = async () => {
        setError(null);
        try {
            await adapter.signOut();
        } catch (err) {
            handleError(err);
        }
    };

    const resetPassword = async (email: string) => {
        setError(null);
        try {
            await adapter.resetPassword(email);
        } catch (err) {
            handleError(err);
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider value={{
            user, role, loading, error,
            signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword,
            clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
