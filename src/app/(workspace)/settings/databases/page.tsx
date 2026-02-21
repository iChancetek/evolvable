'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-context';
import { ProjectBlueprint, DatabaseSchema } from '@/lib/agents/types';
import styles from '@/app/(workspace)/workspace.module.css';

interface Column {
    name: string;
    type: string;
    constraints: string;
}

interface Table {
    name: string;
    columns: Column[];
}

function parseSchema(schema: DatabaseSchema | undefined): Table[] {
    if (!schema || !schema.tables || !Array.isArray(schema.tables)) return [];
    return schema.tables.map((t: any) => ({
        name: t.name || 'unknown',
        columns: (t.columns || t.fields || []).map((c: any) => ({
            name: c.name || c,
            type: c.type || 'String',
            constraints: c.constraints || c.required ? 'NOT NULL' : '',
        })),
    }));
}

export default function DatabasesPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const projectIdParam = searchParams?.get('projectId');

    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam ?? '');
    const [tables, setTables] = useState<Table[]>([]);
    const [activeTable, setActiveTable] = useState<string>('');
    const [engine, setEngine] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Load user's projects list
    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            try {
                const q = query(
                    collection(db, 'projects'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({
                    id: d.id,
                    title: (d.data() as ProjectBlueprint).prd?.title || d.id,
                }));
                setProjects(list);
                if (!selectedProjectId && list.length > 0) setSelectedProjectId(list[0].id);
            } catch (e) { console.error('Failed to load projects:', e); }
        };
        fetchProjects();
    }, [user, selectedProjectId]);

    // Load schema for selected project
    useEffect(() => {
        if (!selectedProjectId) return;
        setIsLoading(true);
        const fetchSchema = async () => {
            try {
                const docRef = doc(db, 'projects', selectedProjectId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const bp = docSnap.data() as ProjectBlueprint;
                    const parsed = parseSchema(bp.databaseSchema);
                    setTables(parsed);
                    setEngine(bp.databaseSchema?.engine ?? 'firestore');
                    if (parsed.length > 0) setActiveTable(parsed[0].name);
                }
            } catch (e) { console.error('Failed to load schema:', e); }
            finally { setIsLoading(false); }
        };
        fetchSchema();
    }, [selectedProjectId]);

    const currentTable = tables.find(t => t.name === activeTable);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header className={styles.pageHeader}>
                <h1>Database Architecture</h1>
            </header>
            <div className={styles.pageContent}>
                {/* Project selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '13px', color: '#999', flexShrink: 0 }}>Project:</label>
                    <select
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        style={{ background: '#252526', border: '1px solid #444', color: '#e8eaed', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', flex: 1, maxWidth: '400px' }}
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        {projects.length === 0 && <option value="">No projects found</option>}
                    </select>
                    {engine && (
                        <span style={{ fontSize: '12px', background: '#333', color: '#4ec9b0', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {engine.toUpperCase()}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>Loading schema...</div>
                ) : tables.length === 0 ? (
                    <div style={{ background: '#252526', borderRadius: '6px', border: '1px solid #333', padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: '#666', fontSize: '14px' }}>No database schema found for this project.</p>
                        <p style={{ color: '#444', fontSize: '12px', marginTop: '0.5rem' }}>Run a pipeline first to generate the schema via the DB Architect agent.</p>
                    </div>
                ) : (
                    <div style={{ background: '#252526', borderRadius: '6px', border: '1px solid #333', overflow: 'hidden' }}>
                        {/* Table tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #333', overflowX: 'auto' }}>
                            {tables.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => setActiveTable(t.name)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRight: '1px solid #333',
                                        fontSize: '13px',
                                        fontWeight: activeTable === t.name ? 600 : 400,
                                        color: activeTable === t.name ? '#fff' : '#999',
                                        background: activeTable === t.name ? '#2d2d2d' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        borderBottom: activeTable === t.name ? '2px solid #4285f4' : '2px solid transparent',
                                    }}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>

                        {/* Columns table */}
                        {currentTable && (
                            <div style={{ padding: '1.5rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ color: '#999', textAlign: 'left' }}>
                                            <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #333', width: '35%' }}>Column</th>
                                            <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #333', width: '25%' }}>Type</th>
                                            <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #333' }}>Constraints</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentTable.columns.map((col, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '0.75rem 0', color: '#569cd6', borderTop: i > 0 ? '1px solid #2a2a2a' : undefined }}>{col.name}</td>
                                                <td style={{ padding: '0.75rem 0', color: '#4ec9b0', borderTop: i > 0 ? '1px solid #2a2a2a' : undefined }}>{col.type}</td>
                                                <td style={{ padding: '0.75rem 0', color: '#ce9178', borderTop: i > 0 ? '1px solid #2a2a2a' : undefined }}>{col.constraints || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <button
                                    style={{ marginTop: '1rem', background: 'transparent', border: '1px dashed #444', color: '#666', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    + Add Column (Draft)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Info footer */}
                {tables.length > 0 && (
                    <p style={{ marginTop: '1rem', fontSize: '12px', color: '#444' }}>
                        Schema generated by the DB Architect agent. Visual schema migrations coming in Phase 8.
                    </p>
                )}
            </div>
        </div>
    );
}
