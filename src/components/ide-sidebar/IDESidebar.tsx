'use client';

import React, { useState } from 'react';
import { ProjectBlueprint } from '@/lib/agents/types';
import { ExplorerPanel } from './ExplorerPanel';
import { FileViewer } from './FileViewer';
import { SourceControlPanel } from './SourceControlPanel';
import { GitHubActionsPanel } from './GitHubActionsPanel';
import { GitHubPanel } from './GitHubPanel';
import {
    FolderTree, GitBranch, Play, Globe, Puzzle, RefreshCw, Github,
    Check, Shield, Hexagon, Zap, DollarSign, Sparkles,
} from 'lucide-react';

export type SidebarTab = 'explorer' | 'source-control' | 'run' | 'remote' | 'extensions' | 'actions' | 'github';

interface IDESidebarProps {
    blueprint: ProjectBlueprint | null;
    projectId: string | null;
    isVisible: boolean;
}

const ACTIVITY_ICONS: { id: SidebarTab; Icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'explorer', Icon: FolderTree, label: 'Explorer' },
    { id: 'source-control', Icon: GitBranch, label: 'Source Control' },
    { id: 'run', Icon: Play, label: 'Run & Debug' },
    { id: 'remote', Icon: Globe, label: 'Remote Explorer' },
    { id: 'extensions', Icon: Puzzle, label: 'Extensions' },
    { id: 'actions', Icon: RefreshCw, label: 'GitHub Actions' },
    { id: 'github', Icon: Github, label: 'GitHub' },
];

function PlaceholderPanel({ title, icon, description }: { title: string; icon: string; description: string }) {
    return (
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>{icon}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>{description}</div>
            <div style={{
                marginTop: '1.5rem', padding: '0.4rem 0.875rem',
                background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.2)',
                borderRadius: '6px', fontSize: '0.7rem', color: '#79c0ff',
                display: 'inline-block',
            }}>
                Phase 2 — Coming Soon
            </div>
        </div>
    );
}

export function IDESidebar({ blueprint, projectId, isVisible }: IDESidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');
    const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);

    if (!isVisible) return null;

    const handleFileSelect = (filename: string, content: string) => {
        setSelectedFile({ name: filename, content });
    };

    const renderPanel = () => {
        switch (activeTab) {
            case 'explorer':
                return blueprint ? (
                    <ExplorerPanel
                        blueprint={blueprint}
                        onFileSelect={handleFileSelect}
                        activeFile={selectedFile?.name}
                    />
                ) : (
                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                        No project loaded
                    </div>
                );

            case 'source-control':
                return <SourceControlPanel projectId={projectId} />;

            case 'run':
                return <PlaceholderPanel title="Run & Debug" icon="▶" description="Start a local dev server to preview and debug your generated app." />;

            case 'remote':
                return <PlaceholderPanel title="Remote Explorer" icon="⊕" description="Connect to your deployed environments (AWS, Vercel, Azure) to view logs and status." />;

            case 'extensions':
                return (
                    <div style={{ padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                            Extensions
                        </div>
                        {[
                            { name: 'ESLint', desc: 'Real-time code linting', icon: '✓', active: true },
                            { name: 'Security Scanner', desc: 'Scan for vulnerabilities', icon: '🛡', active: true },
                            { name: 'Terraform Validator', desc: 'Validate IaC configs', icon: '◈', active: false },
                            { name: 'Perf Profiler', desc: 'Measure runtime perf', icon: '⚡', active: false },
                            { name: 'Cost Estimator', desc: 'Estimate cloud costs', icon: '💰', active: false },
                            { name: 'AI Prompt Enhancer', desc: 'Improve your prompts', icon: '✨', active: true },
                        ].map(ext => (
                            <div key={ext.name} style={{
                                display: 'flex', alignItems: 'center', gap: '0.625rem',
                                padding: '0.5rem 0.625rem', marginBottom: '0.375rem',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{ext.icon}</span>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{ext.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ext.desc}</div>
                                </div>
                                <div style={{
                                    width: '28px', height: '16px',
                                    background: ext.active ? 'rgba(66,133,244,0.8)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: '9999px',
                                    position: 'relative', flexShrink: 0, cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}>
                                    <div style={{
                                        width: '12px', height: '12px', borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute', top: '2px',
                                        left: ext.active ? '14px' : '2px',
                                        transition: 'left 0.2s',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'actions':
                return <GitHubActionsPanel projectId={projectId} repoFullName={blueprint?.github?.repoFullName} />;

            case 'github':
                return <GitHubPanel projectId={projectId} />;

            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', transition: 'all 0.25s ease' }}>
            {/* Activity Bar */}
            <div style={{
                width: '48px',
                flexShrink: 0,
                background: '#080a0e',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '0.5rem',
                gap: '2px',
            }}>
                {ACTIVITY_ICONS.map(({ id, Icon, label }) => (
                    <button
                        key={id}
                        title={label}
                        onClick={() => setActiveTab(id)}
                        style={{
                            width: '42px', height: '38px',
                            background: activeTab === id ? 'rgba(66,133,244,0.12)' : 'none',
                            border: 'none',
                            borderLeft: activeTab === id ? '2px solid #4285f4' : '2px solid transparent',
                            borderRadius: '0 4px 4px 0',
                            cursor: 'pointer',
                            color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <Icon size={18} />
                    </button>
                ))}
            </div>

            {/* Panel */}
            <div style={{
                width: '230px',
                flexShrink: 0,
                background: '#0a0c10',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Panel Header */}
                <div style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexShrink: 0,
                }}>
                    <span>{(() => { const item = ACTIVITY_ICONS.find(a => a.id === activeTab); return item ? <item.Icon size={14} /> : null; })()}</span>
                    {ACTIVITY_ICONS.find(a => a.id === activeTab)?.label}
                </div>

                {/* Panel Content */}
                <div style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.05) transparent' }}>
                    {renderPanel()}
                </div>
            </div>

            {/* File Viewer (opens when file selected) */}
            {selectedFile && (
                <div style={{
                    width: '480px',
                    flexShrink: 0,
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#0d0f14',
                }}>
                    <FileViewer
                        filename={selectedFile.name}
                        content={selectedFile.content}
                        onClose={() => setSelectedFile(null)}
                    />
                </div>
            )}
        </div>
    );
}
