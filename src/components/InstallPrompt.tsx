'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: string }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed this session
        const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!deferredPrompt || dismissed) return null;

    const handleInstall = async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('pwa-install-dismissed', 'true');
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '16px',
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
            fontFamily: 'var(--font-family)',
        }}>
            <span style={{ fontSize: '20px' }}>📱</span>
            <span>Install Evolvable for a better experience</span>
            <button
                onClick={handleInstall}
                style={{
                    padding: '6px 16px',
                    borderRadius: '999px',
                    background: 'white',
                    color: '#0a0a0a',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                Install
            </button>
            <button
                onClick={handleDismiss}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 4px',
                }}
            >
                ×
            </button>
        </div>
    );
}
