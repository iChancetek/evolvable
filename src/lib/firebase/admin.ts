import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
            credential = admin.credential.cert(serviceAccount);
            console.log('[Firebase Admin] Loaded service account credential bounds.');
        } catch (e) {
            console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        }
    }

    const initConfig: admin.AppOptions = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'evolvable-ab705',
    };

    if (credential) {
        initConfig.credential = credential;
    }

    admin.initializeApp(initConfig);
}

export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
