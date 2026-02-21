import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    type User,
    type Unsubscribe,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

/* ===== Auth Adapter Interface ===== */
export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    provider: string;
}

export interface AuthAdapter {
    signInWithGoogle(): Promise<AuthUser>;
    signInWithEmail(email: string, password: string): Promise<AuthUser>;
    signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser>;
    signOut(): Promise<void>;
    resetPassword(email: string): Promise<void>;
    getCurrentUser(): AuthUser | null;
    onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe;
}

/* ===== Firebase User → AuthUser mapper ===== */
function mapUser(user: User): AuthUser {
    const providerData = user.providerData[0];
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        provider: providerData?.providerId || 'unknown',
    };
}

/* ===== Firebase Auth Adapter ===== */
export class FirebaseAuthAdapter implements AuthAdapter {
    private googleProvider = new GoogleAuthProvider();

    constructor() {
        this.googleProvider.addScope('email');
        this.googleProvider.addScope('profile');
    }

    async signInWithGoogle(): Promise<AuthUser> {
        const result = await signInWithPopup(auth, this.googleProvider);
        return mapUser(result.user);
    }

    async signInWithEmail(email: string, password: string): Promise<AuthUser> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return mapUser(result.user);
    }

    async signUpWithEmail(email: string, password: string): Promise<AuthUser> {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Send email verification
        await sendEmailVerification(result.user);
        return mapUser(result.user);
    }

    async signOut(): Promise<void> {
        await firebaseSignOut(auth);
    }

    async resetPassword(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    }

    getCurrentUser(): AuthUser | null {
        const user = auth.currentUser;
        return user ? mapUser(user) : null;
    }

    onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe {
        return firebaseOnAuthStateChanged(auth, (user) => {
            callback(user ? mapUser(user) : null);
        });
    }
}

/* ===== Singleton instance ===== */
let adapterInstance: AuthAdapter | null = null;

export function getAuthAdapter(): AuthAdapter {
    if (!adapterInstance) {
        adapterInstance = new FirebaseAuthAdapter();
    }
    return adapterInstance;
}
