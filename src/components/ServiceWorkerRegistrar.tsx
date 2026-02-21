'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .catch(() => {
                    // Silent fail — SW registration is non-critical
                });
        }
    }, []);

    return null;
}
