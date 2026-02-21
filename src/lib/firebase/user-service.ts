import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    getDocs,
    query,
    orderBy,
    limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserRole } from '@/lib/auth/roles';

export interface UserProfile {
    uid?: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    provider: string;
    role: UserRole;
    createdAt?: unknown;
    lastLoginAt?: unknown;
}

/* Create user profile on first signup/login */
export async function createUserProfile(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt' | 'lastLoginAt'>): Promise<void> {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, {
        ...data,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
    });
}

/* Get user profile */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
}

/* Update user role — admin only */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { role });
}

/* Update last login timestamp */
export async function updateLastLogin(uid: string): Promise<void> {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { lastLoginAt: serverTimestamp() });
}

/* Get all users (admin) */
export async function getAllUsers(maxCount = 100): Promise<UserProfile[]> {
    const ref = collection(db, 'users');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
}

/* Get user count */
export async function getUserCount(): Promise<number> {
    const ref = collection(db, 'users');
    const snap = await getDocs(ref);
    return snap.size;
}
