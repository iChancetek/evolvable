import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCDHlSL0UzGWZVDGZQs-DGp0WnTZr3rNCQ",
    authDomain: "evolvable-ab705.firebaseapp.com",
    projectId: "evolvable-ab705",
    storageBucket: "evolvable-ab705.firebasestorage.app",
    messagingSenderId: "241386462301",
    appId: "1:241386462301:web:94057c8ee104eb6e6e01b4",
    measurementId: "G-6HKKDEKNYQ"
};

// Singleton — prevent re-initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
