'use client';

import React from 'react';
import styles from '@/app/(workspace)/workspace.module.css';

export default function UsagePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className={styles.pageHeader}>
                <h1>Pipeline Usage & Quotas</h1>
            </header>
            <div className={styles.pageContent}>
                <div style={{ maxWidth: '800px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#252526', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '0.5rem' }}>TOTAL PROJECTS</div>
                            <div style={{ fontSize: '24px', color: '#fff' }}>1</div>
                        </div>
                        <div style={{ background: '#252526', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '0.5rem' }}>PIPELINE EXECUTIONS</div>
                            <div style={{ fontSize: '24px', color: '#fff' }}>2</div>
                        </div>
                        <div style={{ background: '#252526', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '0.5rem' }}>AI TOKEN EST. ($)</div>
                            <div style={{ fontSize: '24px', color: '#fff' }}>$0.84</div>
                        </div>
                    </div>

                    <div style={{ background: '#252526', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                        <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '1rem' }}>Evolvable Credits</h3>
                        <div style={{ width: '100%', backgroundColor: '#1e1e1e', height: '8px', borderRadius: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
                            <div style={{ width: '15%', backgroundColor: 'var(--color-accent-green)', height: '100%' }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#ccc' }}>15% of your free tier monthly quota used (1.5M / 10M tokens).</p>

                        <button style={{ marginTop: '1.5rem', background: 'var(--color-accent-blue)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                            Upgrade to Pro
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
