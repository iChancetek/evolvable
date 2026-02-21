'use client';

import React from 'react';
import styles from '@/app/(workspace)/workspace.module.css';

export default function PublishPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className={styles.pageHeader}>
                <h1>Deployment Hub</h1>
            </header>
            <div className={styles.pageContent}>
                <div style={{ maxWidth: '800px' }}>
                    <div style={{ background: 'rgba(38, 166, 154, 0.1)', border: '1px solid var(--color-accent-green)', padding: '1rem', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
                        <span style={{ fontSize: '20px' }}>🌐</span>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '14px' }}>Production Environment (Live)</h3>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '13px', color: '#ccc' }}>Your application has been compiled by the AI pipeline and is currently passing all health checks.</p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" style={{ background: 'var(--color-accent-green)', color: '#000', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                                    Visit Application ↗
                                </a>
                                <button style={{ background: 'transparent', border: '1px solid var(--color-accent-green)', color: 'var(--color-accent-green)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                    View Logs
                                </button>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '1rem' }}>Export Artifacts</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: '#252526', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '24px', marginBottom: '1rem' }}>🐳</div>
                            <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '14px' }}>Docker Container</h4>
                            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 1rem 0' }}>Download the generated multi-stage `Dockerfile` and `.dockerignore` to host on your own AWS/GCP infrastructure.</p>
                            <button style={{ background: '#333', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', width: '100%' }}>Download Docker Config</button>
                        </div>
                        <div style={{ background: '#252526', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '24px', marginBottom: '1rem' }}>⚡</div>
                            <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '14px' }}>Vercel Deploy</h4>
                            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 1rem 0' }}>Push the generated Next.js React 19 codebase directly to a connected Vercel account for instant Edge hosting.</p>
                            <button style={{ background: '#000', color: '#fff', border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <svg height="15" viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M577.344 0L1154.69 1000H0L577.344 0Z" fill="white" /></svg>
                                Deploy to Vercel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
