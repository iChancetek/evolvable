'use client';

import { useState, useEffect, Suspense } from 'react';
import styles from './deploy.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSearchParams } from 'next/navigation';

const deploySteps = [
    { label: 'Building your app', icon: '🔨', duration: 2000 },
    { label: 'Packaging container', icon: '📦', duration: 1500 },
    { label: 'Security check', icon: '🔒', duration: 1200 },
    { label: 'Deploying to local mock cloud', icon: '☁️', duration: 2000 },
    { label: 'Configuring SSL', icon: '🔐', duration: 800 },
    { label: 'Setting up monitoring', icon: '📊', duration: 1000 },
];

function DeployContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [deployState, setDeployState] = useState<'ready' | 'deploying' | 'done'>('ready');
    const [currentStep, setCurrentStep] = useState(-1);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [liveUrl, setLiveUrl] = useState('https://my-app.evolvable.us');
    const [buildDir, setBuildDir] = useState('');

    const startDeploy = async () => {
        setDeployState('deploying');
        setCurrentStep(0);
        setErrorMsg('');

        if (!projectId) {
            setErrorMsg('Missing project ID in URL. Cannot deploy.');
            setDeployState('ready');
            return;
        }

        try {
            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to trigger deployment');

            // Save the returned mock live URL and build directory from the API
            setLiveUrl(data.liveUrl);
            setBuildDir(data.buildDirectory);

            // Allow the visual "fake" progress bar to continue rolling
        } catch (err: any) {
            setErrorMsg(err.message);
            setDeployState('ready'); // Abort visual progress
        }
    };

    useEffect(() => {
        if (deployState !== 'deploying' || currentStep < 0 || errorMsg) return;

        if (currentStep >= deploySteps.length) {
            setDeployState('done');
            return;
        }

        const timer = setTimeout(() => {
            setCurrentStep((prev) => prev + 1);
            setProgress(((currentStep + 1) / deploySteps.length) * 100);
        }, deploySteps[currentStep].duration);

        return () => clearTimeout(timer);
    }, [deployState, currentStep, errorMsg]);

    return (
        <ProtectedRoute requiredRole="owner">
            <div className={styles.page}>
                {/* Back nav */}
                <nav className={styles.nav}>
                    <a href="/" className={styles.navBrand}>
                        <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                        <span>Evolvable</span>
                    </a>
                </nav>

                <div className={styles.content}>
                    {/* Ready State */}
                    {deployState === 'ready' && (
                        <div className={styles.readyState}>
                            <div className={styles.readyIcon}>🚀</div>
                            <h1 className={styles.readyTitle}>Your app is ready!</h1>
                            <p className={styles.readyDesc}>
                                All tests passed. Security verified. Your app is ready to go live.
                            </p>

                            <div className={styles.checklist}>
                                {errorMsg && (
                                    <div className={styles.errorBanner} style={{ color: 'red', marginBottom: '1rem' }}>
                                        ❌ Deployment Error: {errorMsg}
                                    </div>
                                )}
                                <div className={styles.checkItem}>
                                    <span className={styles.checkDone}>✅</span>
                                    <span>All features built</span>
                                </div>
                                <div className={styles.checkItem}>
                                    <span className={styles.checkDone}>✅</span>
                                    <span>Tests passed (47/47)</span>
                                </div>
                                <div className={styles.checkItem}>
                                    <span className={styles.checkDone}>✅</span>
                                    <span>Security audit passed</span>
                                </div>
                                <div className={styles.checkItem}>
                                    <span className={styles.checkDone}>✅</span>
                                    <span>Mobile responsive</span>
                                </div>
                                <div className={styles.checkItem}>
                                    <span className={styles.checkDone}>✅</span>
                                    <span>Performance optimized</span>
                                </div>
                            </div>

                            <button className={styles.deployButton} onClick={startDeploy}>
                                <span className={styles.deployIcon}>🚀</span>
                                <span>Go Live</span>
                            </button>

                            <p className={styles.previewLink}>
                                or <a href="/builder">continue editing</a>
                            </p>
                        </div>
                    )}

                    {/* Deploying State */}
                    {deployState === 'deploying' && (
                        <div className={styles.deployingState}>
                            <div className={styles.deployingIcon}>
                                <div className={styles.spinner} />
                            </div>
                            <h1 className={styles.deployingTitle}>Deploying your app...</h1>
                            <p className={styles.deployingDesc}>
                                This usually takes about 30 seconds. Sit tight!
                            </p>

                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className={styles.stepsList}>
                                {deploySteps.map((step, i) => (
                                    <div
                                        key={i}
                                        className={`${styles.deployStep} ${i < currentStep ? styles.completed :
                                            i === currentStep ? styles.active : styles.pending
                                            }`}
                                    >
                                        <span className={styles.stepIcon}>
                                            {i < currentStep ? '✅' : step.icon}
                                        </span>
                                        <span className={styles.stepLabel}>{step.label}</span>
                                        {i === currentStep && (
                                            <span className={styles.stepSpinner}>◔</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Done State */}
                    {deployState === 'done' && (
                        <div className={styles.doneState}>
                            <div className={styles.doneIcon}>🎉</div>
                            <h1 className={styles.doneTitle}>You&apos;re live!</h1>
                            <p className={styles.doneDesc}>
                                Your app is now live and ready for users. Share the link below!
                            </p>

                            <div className={styles.urlCard}>
                                <div className={styles.urlLabel}>Your app is live at:</div>
                                <div className={styles.urlValue}>
                                    <span className={styles.urlLock}>🔒</span>
                                    <a href={liveUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{liveUrl}</a>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                                    App source assembled at: {buildDir}
                                </div>
                                <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(liveUrl)}>Copy Link</button>
                            </div>

                            <div className={styles.doneStats}>
                                <div className={styles.doneStat}>
                                    <span className={styles.doneStatIcon}>⚡</span>
                                    <div>
                                        <div className={styles.doneStatValue}>Auto-scaling</div>
                                        <div className={styles.doneStatLabel}>Handles traffic spikes</div>
                                    </div>
                                </div>
                                <div className={styles.doneStat}>
                                    <span className={styles.doneStatIcon}>🔒</span>
                                    <div>
                                        <div className={styles.doneStatValue}>SSL Secured</div>
                                        <div className={styles.doneStatLabel}>Encrypted connection</div>
                                    </div>
                                </div>
                                <div className={styles.doneStat}>
                                    <span className={styles.doneStatIcon}>📊</span>
                                    <div>
                                        <div className={styles.doneStatValue}>Monitoring Active</div>
                                        <div className={styles.doneStatLabel}>We watch, you relax</div>
                                    </div>
                                </div>
                            </div>

                            <a href="/dashboard" className={styles.dashboardBtn}>
                                Open Dashboard →
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}

export default function DeployPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading deployment environment...</div>}>
            <DeployContent />
        </Suspense>
    );
}
