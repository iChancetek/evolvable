import type { NextConfig } from "next";

let firebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
};

if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
        console.log("Successfully parsed FIREBASE_WEBAPP_CONFIG at build time.");
    } catch (e) {
        console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
    }
}

const nextConfig: NextConfig = {
    env: {
        // App Hosting doesn't easily expose non-secret env vars to the client via .env
        // so we manually map the injected JSON block into NEXT_PUBLIC_ prefixes 
        // directly during the Next.js compilation phase.
        ...(firebaseConfig.apiKey ? { NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey } : {}),
        ...(firebaseConfig.authDomain ? { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain } : {}),
        ...(firebaseConfig.projectId ? { NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId } : {}),
        ...(firebaseConfig.storageBucket ? { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket } : {}),
        ...(firebaseConfig.messagingSenderId ? { NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId } : {}),
        ...(firebaseConfig.appId ? { NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId } : {}),
        ...(firebaseConfig.measurementId ? { NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: firebaseConfig.measurementId } : {}),
    }
};

export default nextConfig;
