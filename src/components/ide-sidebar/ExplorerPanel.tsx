'use client';

import React, { useState } from 'react';
import { ProjectBlueprint } from '@/lib/agents/types';

interface ExplorerPanelProps {
    blueprint: ProjectBlueprint;
    onFileSelect: (filename: string, content: string) => void;
    activeFile?: string;
}

interface FileNode {
    name: string;
    path: string;
    content: string;
}

interface FolderGroup {
    label: string;
    icon: string;
    color: string;
    files: FileNode[];
}

const FOLDER_ORDER = ['frontend', 'backend', 'infra', 'docker', 'scripts', 'database', 'docs'];

function buildFileTree(blueprint: ProjectBlueprint): FolderGroup[] {
    const groups: Record<string, FolderGroup> = {
        frontend: { label: 'Frontend', icon: '⚛️', color: '#61dafb', files: [] },
        backend: { label: 'Backend (API Routes)', icon: '⚡', color: '#fbbf24', files: [] },
        infra: { label: 'Infrastructure (Terraform)', icon: '☁️', color: '#a855f7', files: [] },
        docker: { label: 'Docker', icon: '🐋', color: '#0ea5e9', files: [] },
        scripts: { label: 'Scripts', icon: '📜', color: '#22c55e', files: [] },
        database: { label: 'Database (Prisma)', icon: '🗄️', color: '#f97316', files: [] },
        docs: { label: 'Documentation', icon: '📚', color: '#94a3b8', files: [] },
    };

    // Frontend codebase
    if (blueprint.codebase?.files) {
        Object.entries(blueprint.codebase.files).forEach(([path, content]) => {
            groups.frontend.files.push({ name: path, path, content: content || '' });
        });
    }

    // Backend API routes
    if (blueprint.backendRoutes?.routes) {
        blueprint.backendRoutes.routes.forEach(route => {
            const filename = `src/app/api${route.path}/route.ts`;
            groups.backend.files.push({ name: filename, path: filename, content: route.code || '' });
        });
    }

    // Terraform
    if (blueprint.infraTerraform?.files) {
        Object.entries(blueprint.infraTerraform.files).forEach(([name, content]) => {
            groups.infra.files.push({ name, path: `infra/${name}`, content: content || '' });
        });
    }

    // Docker
    if (blueprint.infraDocker?.files) {
        Object.entries(blueprint.infraDocker.files).forEach(([name, content]) => {
            groups.docker.files.push({ name, path: `docker/${name}`, content: content || '' });
        });
    }

    // Scripts
    if (blueprint.infraScript?.files) {
        Object.entries(blueprint.infraScript.files).forEach(([name, content]) => {
            groups.scripts.files.push({ name, path: `scripts/${name}`, content: content || '' });
        });
    }

    // Database schema (if available as text)
    if (blueprint.databaseSchema) {
        const schemaText = JSON.stringify(blueprint.databaseSchema, null, 2);
        groups.database.files.push({ name: 'schema.prisma', path: 'prisma/schema.prisma', content: schemaText });
    }

    return FOLDER_ORDER.map(k => groups[k]).filter(g => g.files.length > 0);
}

function getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
        ts: '𝒯', tsx: '⚛', js: '𝒿', jsx: '⚛', css: '🎨', json: '{}',
        md: '📝', yaml: 'Y', yml: 'Y', sh: '$', tf: '◈', dockerfile: '🐋',
        py: '🐍', sql: '🗄', env: '⚙', prisma: '◆',
    };
    return icons[ext || ''] || '📄';
}

export function ExplorerPanel({ blueprint, onFileSelect, activeFile }: ExplorerPanelProps) {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');

    const tree = buildFileTree(blueprint);
    const totalFiles = tree.reduce((acc, g) => acc + g.files.length, 0);

    const toggle = (label: string) =>
        setCollapsed(p => ({ ...p, [label]: !p[label] }));

    const filtered = search.trim()
        ? tree.map(g => ({
            ...g,
            files: g.files.filter(f =>
                f.name.toLowerCase().includes(search.toLowerCase()) ||
                f.content.toLowerCase().includes(search.toLowerCase())
            )
        })).filter(g => g.files.length > 0)
        : tree;

    if (totalFiles === 0) {
        return (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>📁</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                    No generated files yet.<br />
                    Run the pipeline to generate code.
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search */}
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '5px',
                    padding: '0.3rem 0.625rem',
                }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>🔍</span>
                    <input
                        placeholder="Search files..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            background: 'none', border: 'none', outline: 'none',
                            color: '#e8eaed', fontSize: '0.75rem', flex: 1,
                            fontFamily: 'inherit',
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>×</button>
                    )}
                </div>
            </div>

            {/* Tree */}
            <div style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.05) transparent' }}>
                {filtered.map(group => (
                    <div key={group.label}>
                        {/* Group Header */}
                        <button
                            onClick={() => toggle(group.label)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                width: '100%', padding: '0.3rem 0.75rem',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: '0.65rem', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                textAlign: 'left',
                            }}
                        >
                            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)' }}>
                                {collapsed[group.label] ? '▶' : '▼'}
                            </span>
                            <span>{group.icon}</span>
                            <span style={{ color: group.color }}>{group.label}</span>
                            <span style={{
                                marginLeft: 'auto',
                                background: 'rgba(255,255,255,0.06)',
                                borderRadius: '9999px',
                                padding: '0 5px',
                                fontSize: '0.6rem',
                                color: 'rgba(255,255,255,0.3)',
                            }}>
                                {group.files.length}
                            </span>
                        </button>

                        {/* Files */}
                        {!collapsed[group.label] && group.files.map(file => (
                            <button
                                key={file.path}
                                onClick={() => onFileSelect(file.path, file.content)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    width: '100%', padding: '0.25rem 0.75rem 0.25rem 1.5rem',
                                    background: activeFile === file.path ? 'rgba(66,133,244,0.1)' : 'none',
                                    border: 'none',
                                    borderLeft: activeFile === file.path ? '2px solid #4285f4' : '2px solid transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <span style={{ fontSize: '0.65rem', color: group.color, flexShrink: 0 }}>
                                    {getFileIcon(file.name)}
                                </span>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: activeFile === file.path ? '#fff' : 'rgba(255,255,255,0.5)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                    fontFamily: "'Fira Code', monospace",
                                }}>
                                    {file.name.split('/').pop()}
                                </span>
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                padding: '0.5rem 0.75rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.2)',
            }}>
                {totalFiles} files · Plan v{blueprint.activePlanVersion || 1}
            </div>
        </div>
    );
}
