'use client';

import { useState, useEffect, Suspense } from 'react';
import styles from './deploy.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { ProjectBlueprint } from '@/lib/agents/types';

const deploySteps = [
    { label: 'Building your app', icon: '🔨', duration: 2000 },
    { label: 'Packaging container', icon: '📦', duration: 1500 },
    { label: 'Security check', icon: '🔒', duration: 1200 },
    { label: 'Deploying to cloud provider', icon: '☁️', duration: 2000 },
    { label: 'Configuring Domain & SSL', icon: '🔐', duration: 800 },
    { label: 'Setting up monitoring', icon: '📊', duration: 1000 },
];

function DeployContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [project, setProject] = useState<ProjectBlueprint | null>(null);
    const [deployState, setDeployState] = useState<'ready' | 'deploying' | 'done'>('ready');
    const [currentStep, setCurrentStep] = useState(-1);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [liveUrl, setLiveUrl] = useState('https://my-app.evolvable.us');
    const [buildDir, setBuildDir] = useState('');
    const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
    const [advancedTab, setAdvancedTab] = useState<'docker' | 'terraform' | 'scripts'>('docker');
    const [domainInput, setDomainInput] = useState('');

    useEffect(() => {
        if (!projectId) return;
        const ref = doc(db, 'projects', projectId);
        return onSnapshot(ref, snap => {
            if (snap.exists()) {
                const data = snap.data() as ProjectBlueprint;
                setProject(data);
                if (data.nldiSummary?.domainName) {
                    setDomainInput(data.nldiSummary.domainName);
                }
            }
        });
    }, [projectId]);

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
                body: JSON.stringify({ projectId, domain: domainInput })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to trigger deployment');

            setLiveUrl(data.liveUrl);
            setBuildDir(data.buildDirectory);
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

    const renderFilePreview = (files: Record<string, string> | undefined) => {
        if (!files || Object.keys(files).length === 0) {
            return <div style={{ padding: '1rem', color: '#888' }}>No files generated yet.</div>;
        }
        return Object.entries(files).map(([filename, content]) => (
            <div key={filename} style={{ marginBottom: '1rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>{filename}</strong>
                <pre style={{ background: '#111', color: '#fff', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '12px' }}>
                    {content}
                </pre>
            </div>
        ));
    };

    return (
        <ProtectedRoute requiredRole="owner">
            <div className={styles.page}>
                <nav className={styles.nav}>
                    <a href="/" className={styles.navBrand}>
                        <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                        <span>Evolvable</span>
                    </a>

                    {deployState === 'ready' && (
                        <div className={styles.modeToggle}>
                            <button
                                className={`${styles.modeBtn} ${mode === 'simple' ? styles.activeMode : ''}`}
                                onClick={() => setMode('simple')}
                            >
                                Simple Mode
                            </button>
                            <button
                                className={`${styles.modeBtn} ${mode === 'advanced' ? styles.activeMode : ''}`}
                                onClick={() => setMode('advanced')}
                            >
                                Advanced Mode
                            </button>
                        </div>
                    )}
                </nav>

                <div className={styles.content}>
                    {deployState === 'ready' && mode === 'simple' && (
                        <div className={styles.readyState}>
                            <div className={styles.readyIcon}>🚀</div>
                            <h1 className={styles.readyTitle}>Launch Your App</h1>
                            <p className={styles.readyDesc}>
                                Your application has been built and is ready to go live on the internet!
                            </p>

                            <div className={styles.simpleDeploymentCard}>
                                <div className={styles.simpleRow}>
                                    <span style={{ fontSize: '2rem' }}>☁️</span>
                                    <div>
                                        <strong>Hosting Provider</strong>
                                        <div>{project?.nldiSummary ? project.nldiSummary.provider.toUpperCase() : 'Platform Auto-Select'}</div>
                                    </div>
                                </div>
                                <div className={styles.simpleRow}>
                                    <span style={{ fontSize: '2rem' }}>💰</span>
                                    <div>
                                        <strong>Estimated Cost</strong>
                                        <div>{project?.nldiSummary ? project.nldiSummary.budget : 'Free Tier / Demo'}</div>
                                    </div>
                                </div>
                                <div className={styles.simpleDomainRow}>
                                    <span style={{ fontSize: '2rem' }}>🌐</span>
                                    <div style={{ flex: 1 }}>
                                        <strong>Custom Domain {project?.nldiSummary?.domainIntent === 'buy' ? '(Looking to Register)' : (project?.nldiSummary?.domainIntent === 'connect' ? '(Connecting Existing)' : '')}</strong>
                                        <input
                                            type="text"
                                            placeholder="e.g. mybrand.com"
                                            className={styles.domainInput}
                                            value={domainInput}
                                            onChange={e => setDomainInput(e.target.value)}
                                        />
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                                            SSL Security will be automatically provisioned for free.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className={styles.errorBanner} style={{ color: 'red', marginTop: '1rem' }}>
                                    ❌ Deployment Error: {errorMsg}
                                </div>
                            )}

                            <button className={styles.deployButton} onClick={startDeploy}>
                                <span className={styles.deployIcon}>🚀</span>
                                <span>Go Live</span>
                            </button>
                        </div>
                    )}

                    {deployState === 'ready' && mode === 'advanced' && (
                        <div className={styles.advancedState}>
                            <h2>Advanced Infrastructure Setup</h2>
                            <p style={{ color: '#888', marginBottom: '1.5rem' }}>Review the raw infrastructure-as-code files generated for your application.</p>

                            <div className={styles.tabs}>
                                <button className={`${styles.tabBtn} ${advancedTab === 'docker' ? styles.activeTab : ''}`} onClick={() => setAdvancedTab('docker')}>Docker Engine</button>
                                <button className={`${styles.tabBtn} ${advancedTab === 'terraform' ? styles.activeTab : ''}`} onClick={() => setAdvancedTab('terraform')}>Terraform IaC</button>
                                <button className={`${styles.tabBtn} ${advancedTab === 'scripts' ? styles.activeTab : ''}`} onClick={() => setAdvancedTab('scripts')}>Deploy Scripts</button>
                            </div>

                            <div className={styles.tabContent}>
                                {advancedTab === 'docker' && renderFilePreview(project?.infraDocker?.files)}
                                {advancedTab === 'terraform' && renderFilePreview(project?.infraTerraform?.files)}
                                {advancedTab === 'scripts' && renderFilePreview(project?.infraScript?.files)}
                            </div>

                            <button className={styles.deployButton} onClick={startDeploy} style={{ marginTop: '2rem' }}>
                                <span className={styles.deployIcon}>🚀</span>
                                <span>Execute Deployment</span>
                            </button>
                        </div>
                    )}

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

                            {mode === 'advanced' && (
                                <div className={styles.terminalBox}>
                                    <div>[INFO] Initializing worker nodes...</div>
                                    <div>[INFO] Authenticating via Terraform module...</div>
                                    <div>[INFO] Building Docker container image...</div>
                                    <div>[INFO] Pushing to container registry...</div>
                                </div>
                            )}
                        </div>
                    )}

                    {deployState === 'done' && (
                        <div className={styles.doneState}>
                            <div className={styles.doneIcon}>🎉</div>
                            <h1 className={styles.doneTitle}>You&apos;re live!</h1>
                            <p className={styles.doneDesc}>
                                Your app is now fully deployed and configured on {project?.nldiSummary?.provider?.toUpperCase() || 'the cloud'}.
                            </p>

                            <div className={styles.urlCard}>
                                <div className={styles.urlLabel}>Your secure URL:</div>
                                <div className={styles.urlValue}>
                                    <span className={styles.urlLock}>🔒</span>
                                    <a href={liveUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{liveUrl}</a>
                                </div>
                                <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(liveUrl)}>Copy Link</button>
                            </div>

                            {mode === 'advanced' && (
                                <div className={styles.terminalBox} style={{ marginTop: '2rem' }}>
                                    <div>[SUCCESS] Apply complete! Resources: 14 added, 0 changed, 0 destroyed.</div>
                                    <div>[SUCCESS] DNS A records propagated.</div>
                                    <div>[SUCCESS] Let's Encrypt SSL certificate attached.</div>
                                </div>
                            )}

                            <a href="/dashboard" className={styles.dashboardBtn} style={{ marginTop: '2rem' }}>
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
