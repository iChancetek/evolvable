'use client';

import styles from './offline.module.css';

export default function OfflinePage() {
    return (
        <div className={styles.page}>
            <div className={styles.content}>
                <div className={styles.icon}>📡</div>
                <h1 className={styles.title}>You&apos;re offline</h1>
                <p className={styles.desc}>
                    It looks like you&apos;ve lost your internet connection.
                    <br />
                    Some features may not be available until you&apos;re back online.
                </p>
                <button
                    className={styles.retryBtn}
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
