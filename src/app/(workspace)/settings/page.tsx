'use client';

import React from 'react';
import styles from '@/app/(workspace)/workspace.module.css';
import { useAuth } from '@/lib/auth/auth-context';
import { AVAILABLE_MODELS } from '@/lib/agents/types';

export default function ProfileSettingsPage() {
    const { user } = useAuth();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className={styles.pageHeader}>
                <h1>User Profile</h1>
            </header>
            <div className={styles.pageContent}>
                <div style={{ maxWidth: '600px' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '1rem' }}>Account Information</h3>
                        <div style={{ background: '#252526', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px' }}><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '13px' }}><strong>User UID:</strong> {user?.uid}</p>
                            <p style={{ margin: '0', fontSize: '13px' }}><strong>Role:</strong> Admin</p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '1rem' }}>Global Preferences</h3>
                        <div style={{ background: '#252526', padding: '1rem', borderRadius: '4px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px' }}>Default AI Model</span>
                                <select style={{ background: '#1e1e1e', color: '#ccc', border: '1px solid #333', padding: '0.25rem 0.5rem', borderRadius: '2px', fontSize: '12px', outline: 'none', maxWidth: '300px' }}>
                                    <optgroup label="OpenAI">
                                        {AVAILABLE_MODELS.filter(m => m.provider === 'openai').map(m => (
                                            <option key={m.id} value={m.id}>✨ {m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Anthropic Claude">
                                        {AVAILABLE_MODELS.filter(m => m.provider === 'anthropic').map(m => (
                                            <option key={m.id} value={m.id}>🧠 {m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Google">
                                        {AVAILABLE_MODELS.filter(m => m.provider === 'gemini').map(m => (
                                            <option key={m.id} value={m.id}>🌌 {m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Hugging Face / Open Source">
                                        {AVAILABLE_MODELS.filter(m => m.provider === 'huggingface').map(m => (
                                            <option key={m.id} value={m.id}>🤗 {m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="DeepSeek">
                                        {AVAILABLE_MODELS.filter(m => m.provider === 'deepseek').map(m => (
                                            <option key={m.id} value={m.id}>🐋 {m.name} - {m.description}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px' }}>Visual Theme</span>
                                <select style={{ background: '#1e1e1e', color: '#ccc', border: '1px solid #333', padding: '0.25rem 0.5rem', borderRadius: '2px', fontSize: '12px' }}>
                                    <option value="dark">VS Code Dark+</option>
                                    <option value="light">Light Modern</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
