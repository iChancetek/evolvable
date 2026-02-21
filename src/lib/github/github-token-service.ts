import { adminDb } from '../firebase/admin';
import * as crypto from 'crypto';

const ENCRYPTION_KEY_HEX = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
    if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length < 64) {
        throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
    }
    return Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
}

function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64')
    };
}

function decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
}

export interface GitHubIntegrationRecord {
    githubLogin: string;
    githubId: number;
    avatarUrl: string;
    encryptedToken: string;
    iv: string;
    authTag: string;
    connectedAt: number;
    scope: string;
}

export class GitHubTokenService {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async storeToken(
        accessToken: string,
        githubLogin: string,
        githubId: number,
        avatarUrl: string,
        scope: string
    ): Promise<void> {
        const { encrypted, iv, authTag } = encrypt(accessToken);
        const record: GitHubIntegrationRecord = {
            githubLogin,
            githubId,
            avatarUrl,
            encryptedToken: encrypted,
            iv,
            authTag,
            connectedAt: Date.now(),
            scope
        };
        await adminDb
            .collection('users')
            .doc(this.userId)
            .collection('integrations')
            .doc('github')
            .set(record);
    }

    async getToken(): Promise<string | null> {
        const doc = await adminDb
            .collection('users')
            .doc(this.userId)
            .collection('integrations')
            .doc('github')
            .get();

        if (!doc.exists) return null;
        const data = doc.data() as GitHubIntegrationRecord;
        return decrypt(data.encryptedToken, data.iv, data.authTag);
    }

    async getRecord(): Promise<GitHubIntegrationRecord | null> {
        const doc = await adminDb
            .collection('users')
            .doc(this.userId)
            .collection('integrations')
            .doc('github')
            .get();
        return doc.exists ? (doc.data() as GitHubIntegrationRecord) : null;
    }

    async revokeToken(): Promise<void> {
        await adminDb
            .collection('users')
            .doc(this.userId)
            .collection('integrations')
            .doc('github')
            .delete();
    }
}
