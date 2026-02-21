'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import styles from './builder.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    ProjectBlueprint,
    CanvasNode,
    CanvasPage,
    VisualLayout,
    ComponentType,
    CanvasProp,
} from '@/lib/agents/types';

// --- Component Palette ---
const COMPONENT_PALETTE: { icon: string; label: string; type: ComponentType; category: string }[] = [
    { icon: '🦸', label: 'Hero', type: 'hero', category: 'Layout' },
    { icon: '🧭', label: 'Navbar', type: 'navbar', category: 'Layout' },
    { icon: '🦶', label: 'Footer', type: 'footer', category: 'Layout' },
    { icon: '▦', label: 'Columns', type: 'columns', category: 'Layout' },
    { icon: '—', label: 'Divider', type: 'divider', category: 'Layout' },
    { icon: '📝', label: 'Text', type: 'text', category: 'Content' },
    { icon: '🖼️', label: 'Image', type: 'image', category: 'Content' },
    { icon: '🃏', label: 'Card', type: 'card', category: 'Content' },
    { icon: '✨', label: 'Features', type: 'features', category: 'Content' },
    { icon: '🔘', label: 'Button', type: 'button', category: 'Action' },
    { icon: '📋', label: 'Form', type: 'form', category: 'Action' },
];

// --- Default Props per Component ---
function defaultProps(type: ComponentType): CanvasProp {
    switch (type) {
        case 'hero': return { content: 'Welcome', bgColor: '#1a1a2e', textColor: '#ffffff', padding: 80, borderRadius: 0, align: 'center' };
        case 'navbar': return { content: 'MyApp', bgColor: '#0f0f23', textColor: '#ffffff', padding: 16 };
        case 'footer': return { content: '© 2026 MyApp. All rights reserved.', bgColor: '#0f0f23', textColor: '#888', padding: 24, align: 'center' };
        case 'text': return { content: 'Edit this text by clicking it.', bgColor: 'transparent', textColor: '#e8eaed', padding: 20, align: 'left' };
        case 'button': return { content: 'Click Me', bgColor: '#4285f4', textColor: '#ffffff', padding: 16, borderRadius: 8, href: '#' };
        case 'card': return { content: 'Card Title', bgColor: '#252526', textColor: '#ffffff', padding: 24, borderRadius: 12 };
        case 'features': return { content: 'Key Features', bgColor: '#111122', textColor: '#ffffff', padding: 60, align: 'center' };
        case 'form': return { content: 'Contact Us', bgColor: '#1e1e2e', textColor: '#ffffff', padding: 40, borderRadius: 12 };
        case 'divider': return { bgColor: '#333', padding: 1 };
        case 'image': return { content: 'https://via.placeholder.com/800x400', bgColor: 'transparent', padding: 0, borderRadius: 8 };
        case 'columns': return { content: 'Column 1 | Column 2 | Column 3', bgColor: 'transparent', textColor: '#e8eaed', padding: 40 };
        default: return { content: 'Block', bgColor: '#1e1e1e', textColor: '#fff', padding: 24 };
    }
}

// --- Seed layout from PRD ---
function seedLayoutFromPRD(blueprint: ProjectBlueprint, pageId: string): CanvasNode[] {
    const prd = blueprint.prd;
    if (!prd) return [{ id: 'hero-1', type: 'hero', props: defaultProps('hero'), pageId }];

    const nodes: CanvasNode[] = [
        { id: 'navbar-1', type: 'navbar', props: { ...defaultProps('navbar'), content: prd.title }, pageId },
        { id: 'hero-1', type: 'hero', props: { ...defaultProps('hero'), content: prd.title }, pageId },
    ];
    if (prd.description) {
        nodes.push({ id: 'text-1', type: 'text', props: { ...defaultProps('text'), content: prd.description }, pageId });
    }
    if (prd.features?.length) {
        nodes.push({ id: 'features-1', type: 'features', props: { ...defaultProps('features'), content: prd.features.slice(0, 3).map(f => f.title).join(' • ') }, pageId });
    }
    nodes.push({ id: 'footer-1', type: 'footer', props: defaultProps('footer'), pageId });
    return nodes;
}

type DeviceView = 'desktop' | 'tablet' | 'mobile';

function BuilderContent() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [layout, setLayout] = useState<VisualLayout>({
        pages: [{ id: 'home', path: '/', title: 'Home', nodes: [] }],
        activePage: 'home',
        version: 1,
    });
    const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
    const [sidebarTab, setSidebarTab] = useState<'components' | 'pages'>('components');
    const [draggingPaletteType, setDraggingPaletteType] = useState<ComponentType | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Derived state
    const activePage = layout.pages.find(p => p.id === layout.activePage) ?? layout.pages[0];
    const selectedNode = activePage?.nodes.find(n => n.id === selectedNodeId) ?? null;

    // Load project from Firestore
    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) { setIsLoading(false); return; }
            try {
                const docRef = doc(db, 'projects', projectId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as ProjectBlueprint;
                    setBlueprint(data);
                    if (data.visualLayout) {
                        setLayout(data.visualLayout);
                    } else if (data.prd) {
                        const pageId = 'home';
                        const seeded = seedLayoutFromPRD(data, pageId);
                        setLayout({ pages: [{ id: pageId, path: '/', title: 'Home', nodes: seeded }], activePage: pageId, version: 1 });
                    }
                }
            } catch (err) { console.error('Error fetching project:', err); }
            finally { setIsLoading(false); }
        };
        fetchProject();
    }, [projectId]);

    // Auto-save to Firestore (debounced 1.5s)
    const saveLayout = useCallback((newLayout: VisualLayout) => {
        if (!projectId) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateDoc(doc(db, 'projects', projectId), { visualLayout: newLayout });
            } catch (e) { console.warn('Auto-save failed:', e); }
        }, 1500);
    }, [projectId]);

    const updateLayout = useCallback((newLayout: VisualLayout) => {
        setLayout(newLayout);
        saveLayout(newLayout);
    }, [saveLayout]);

    // Mutate a node's props
    const updateNodeProps = (nodeId: string, patch: Partial<CanvasProp>) => {
        const newLayout: VisualLayout = {
            ...layout,
            pages: layout.pages.map(p => ({
                ...p,
                nodes: p.nodes.map(n => n.id === nodeId ? { ...n, props: { ...n.props, ...patch } } : n),
            })),
        };
        updateLayout(newLayout);
    };

    // Delete a node
    const deleteNode = (nodeId: string) => {
        const newLayout: VisualLayout = {
            ...layout,
            pages: layout.pages.map(p => ({ ...p, nodes: p.nodes.filter(n => n.id !== nodeId) })),
        };
        setSelectedNodeId(null);
        updateLayout(newLayout);
    };

    // --- Drag & Drop Handlers ---
    const handlePaletteDragStart = (type: ComponentType) => setDraggingPaletteType(type);
    const handleCanvasDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const handleCanvasDragLeave = () => setIsDragOver(false);

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!draggingPaletteType) return;
        const newNode: CanvasNode = {
            id: `${draggingPaletteType}-${Date.now()}`,
            type: draggingPaletteType,
            props: defaultProps(draggingPaletteType),
            pageId: activePage.id,
        };
        const newLayout: VisualLayout = {
            ...layout,
            pages: layout.pages.map(p =>
                p.id === activePage.id ? { ...p, nodes: [...p.nodes, newNode] } : p
            ),
        };
        updateLayout(newLayout);
        setSelectedNodeId(newNode.id);
        setDraggingPaletteType(null);
    };

    // Add a new page
    const addPage = () => {
        const id = `page-${Date.now()}`;
        const newLayout: VisualLayout = {
            ...layout,
            pages: [...layout.pages, { id, path: `/${id}`, title: 'New Page', nodes: [] }],
            activePage: id,
        };
        updateLayout(newLayout);
    };

    // AI Prompt submission
    const handleAiPrompt = async () => {
        if (!aiPrompt.trim() || !projectId) return;
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/builder-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, currentLayout: layout, projectId }),
            });
            const data = await res.json();
            if (data.patch) {
                updateNodeProps(data.patch.nodeId, data.patch.updatedProps);
            }
        } catch (e) { console.error('AI assist failed:', e); }
        finally { setIsAiLoading(false); setAiPrompt(''); }
    };

    // Export Code
    const handleExport = async () => {
        try {
            const res = await fetch('/api/export-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layout, projectId }),
            });
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data.files, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'evolvable-export.json'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { console.error('Export failed:', e); }
    };

    const canvasWidths: Record<DeviceView, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };

    return (
        <ProtectedRoute>
            <div className={styles.page}>
                {/* Top Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <a href="/" className={styles.toolbarBrand}>
                            <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
                            <span>Evolvable</span>
                        </a>
                        <div className={styles.divider} />
                        <span className={styles.projectName}>{blueprint?.prd?.title || 'My App'}</span>
                    </div>

                    <div className={styles.toolbarCenter}>
                        <div className={styles.deviceToggle}>
                            {(['desktop', 'tablet', 'mobile'] as DeviceView[]).map(d => (
                                <button
                                    key={d}
                                    className={`${styles.deviceBtn} ${deviceView === d ? styles.active : ''}`}
                                    onClick={() => setDeviceView(d)}
                                    title={d.charAt(0).toUpperCase() + d.slice(1)}
                                >
                                    {d === 'desktop' ? '🖥️' : d === 'tablet' ? '📱' : '📲'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.toolbarRight}>
                        <button className={styles.previewBtn} onClick={handleExport}>
                            ⬇️ Export
                        </button>
                        <a href={`/deploy${projectId ? `?projectId=${projectId}` : ''}`} className={styles.deployBtn}>
                            🚀 Deploy
                        </a>
                    </div>
                </div>

                {isLoading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner} />
                        <p>Loading your canvas...</p>
                    </div>
                ) : (
                    <div className={styles.workspace}>
                        {/* Left Sidebar — Component Palette */}
                        <aside className={styles.sidebar}>
                            <div className={styles.sidebarTabs}>
                                <button className={`${styles.tabBtn} ${sidebarTab === 'components' ? styles.activeTab : ''}`} onClick={() => setSidebarTab('components')}>Components</button>
                                <button className={`${styles.tabBtn} ${sidebarTab === 'pages' ? styles.activeTab : ''}`} onClick={() => setSidebarTab('pages')}>Pages</button>
                            </div>

                            {sidebarTab === 'components' ? (
                                <div className={styles.componentList}>
                                    {['Layout', 'Content', 'Action'].map(cat => (
                                        <div key={cat}>
                                            <div className={styles.paletteCategory}>{cat}</div>
                                            {COMPONENT_PALETTE.filter(c => c.category === cat).map(comp => (
                                                <div
                                                    key={comp.type}
                                                    className={styles.componentItem}
                                                    draggable
                                                    onDragStart={() => handlePaletteDragStart(comp.type)}
                                                >
                                                    <span className={styles.compIcon}>{comp.icon}</span>
                                                    <span className={styles.compName}>{comp.label}</span>
                                                    <span className={styles.dragHandle}>⠿</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.pageList}>
                                    {layout.pages.map(page => (
                                        <div
                                            key={page.id}
                                            className={`${styles.pageItem} ${layout.activePage === page.id ? styles.activePage : ''}`}
                                            onClick={() => updateLayout({ ...layout, activePage: page.id })}
                                        >
                                            <span>📄</span> {page.title}
                                        </div>
                                    ))}
                                    <button className={styles.addPageBtn} onClick={addPage}>+ Add Page</button>
                                </div>
                            )}
                        </aside>

                        {/* Canvas Area */}
                        <main className={styles.canvas} onClick={() => setSelectedNodeId(null)}>
                            <div
                                className={`${styles.canvasFrame} ${isDragOver ? styles.dropZoneActive : ''}`}
                                style={{ width: canvasWidths[deviceView], maxWidth: '100%', transition: 'width 0.3s ease', margin: '0 auto' }}
                                onDragOver={handleCanvasDragOver}
                                onDragLeave={handleCanvasDragLeave}
                                onDrop={handleCanvasDrop}
                            >
                                {activePage.nodes.length === 0 ? (
                                    <div className={styles.emptyCanvas}>
                                        <div className={styles.emptyIcon}>🎨</div>
                                        <h3>Drag components here to start building</h3>
                                        <p>Pick any block from the left panel</p>
                                    </div>
                                ) : (
                                    activePage.nodes.map((node) => (
                                        <CanvasBlock
                                            key={node.id}
                                            node={node}
                                            isSelected={selectedNodeId === node.id}
                                            onSelect={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                                        />
                                    ))
                                )}

                                {isDragOver && (
                                    <div className={styles.dropZoneHint}>Drop here to add block</div>
                                )}
                            </div>

                            {/* AI Prompt Bar */}
                            <div className={styles.aiPromptBar}>
                                <span className={styles.aiIcon}>✨</span>
                                <input
                                    className={styles.aiPromptInput}
                                    placeholder='Ask AI to edit your app, e.g. "Make the hero dark with a blue CTA button"'
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAiPrompt()}
                                />
                                <button className={styles.aiPromptBtn} onClick={handleAiPrompt} disabled={isAiLoading}>
                                    {isAiLoading ? '...' : 'Generate'}
                                </button>
                            </div>
                        </main>

                        {/* Right Panel — Property Inspector */}
                        <aside className={`${styles.propertiesPanel} ${selectedNode ? styles.propsPanelVisible : ''}`}>
                            {selectedNode ? (
                                <>
                                    <h3 className={styles.propTitle}>
                                        {COMPONENT_PALETTE.find(c => c.type === selectedNode.type)?.icon} {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                                    </h3>

                                    {selectedNode.props.content !== undefined && (
                                        <div className={styles.propGroup}>
                                            <label>Content</label>
                                            <textarea
                                                className={styles.propInput}
                                                style={{ minHeight: '80px', resize: 'vertical' }}
                                                value={selectedNode.props.content ?? ''}
                                                onChange={e => updateNodeProps(selectedNode.id, { content: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className={styles.propGroup}>
                                        <label>Background Color</label>
                                        <div className={styles.colorPicker}>
                                            {['#1a1a2e', '#0f0f23', '#252526', '#4285f4', '#a855f7', '#22c55e', '#ec4899', '#ffffff', 'transparent'].map(c => (
                                                <div
                                                    key={c}
                                                    className={`${styles.colorSwatch} ${selectedNode.props.bgColor === c ? styles.colorSwatchActive : ''}`}
                                                    style={{ background: c === 'transparent' ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0/8px 8px' : c }}
                                                    onClick={() => updateNodeProps(selectedNode.id, { bgColor: c })}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.propGroup}>
                                        <label>Text Color</label>
                                        <div className={styles.colorPicker}>
                                            {['#ffffff', '#e8eaed', '#9aa0a6', '#4285f4', '#a855f7', '#22c55e', '#f97316', '#000000'].map(c => (
                                                <div
                                                    key={c}
                                                    className={`${styles.colorSwatch} ${selectedNode.props.textColor === c ? styles.colorSwatchActive : ''}`}
                                                    style={{ background: c }}
                                                    onClick={() => updateNodeProps(selectedNode.id, { textColor: c })}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.propGroup}>
                                        <label>Padding: {selectedNode.props.padding ?? 24}px</label>
                                        <input
                                            type="range" min={0} max={120} step={4}
                                            value={selectedNode.props.padding ?? 24}
                                            onChange={e => updateNodeProps(selectedNode.id, { padding: +e.target.value })}
                                            className={styles.propRange}
                                        />
                                    </div>

                                    {selectedNode.props.borderRadius !== undefined && (
                                        <div className={styles.propGroup}>
                                            <label>Border Radius: {selectedNode.props.borderRadius}px</label>
                                            <input
                                                type="range" min={0} max={48}
                                                value={selectedNode.props.borderRadius ?? 0}
                                                onChange={e => updateNodeProps(selectedNode.id, { borderRadius: +e.target.value })}
                                                className={styles.propRange}
                                            />
                                        </div>
                                    )}

                                    <div className={styles.propGroup}>
                                        <label>Align</label>
                                        <div className={styles.alignToggle}>
                                            {(['left', 'center', 'right'] as const).map(align => (
                                                <button
                                                    key={align}
                                                    className={`${styles.alignBtn} ${selectedNode.props.align === align ? styles.alignBtnActive : ''}`}
                                                    onClick={() => updateNodeProps(selectedNode.id, { align })}
                                                >
                                                    {align === 'left' ? '⬅️' : align === 'center' ? '↔️' : '➡️'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button className={styles.deleteBtn} onClick={() => deleteNode(selectedNode.id)}>
                                        🗑️ Delete Block
                                    </button>
                                </>
                            ) : (
                                <div className={styles.propEmptyState}>
                                    <span style={{ fontSize: '2rem' }}>👆</span>
                                    <p>Click a block on the canvas to edit its properties</p>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}

// --- Canvas Block Renderer ---
function CanvasBlock({ node, isSelected, onSelect }: { node: CanvasNode; isSelected: boolean; onSelect: (e: React.MouseEvent) => void }) {
    const { type, props } = node;
    const baseStyle: React.CSSProperties = {
        backgroundColor: props.bgColor !== 'transparent' ? props.bgColor : undefined,
        color: props.textColor,
        padding: `${props.padding ?? 24}px`,
        borderRadius: `${props.borderRadius ?? 0}px`,
        textAlign: props.align ?? 'left',
        cursor: 'pointer',
        position: 'relative',
        transition: 'outline 0.1s',
        outline: isSelected ? '2px solid #4285f4' : '2px solid transparent',
    };

    const renderContent = () => {
        switch (type) {
            case 'hero': return (
                <div style={{ textAlign: props.align ?? 'center' }}>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1rem', color: props.textColor }}>{props.content}</h1>
                    <p style={{ fontSize: '1.1rem', opacity: 0.7, color: props.textColor }}>Your next big idea, built with AI.</p>
                    <button style={{ marginTop: '2rem', padding: '12px 32px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>Get Started →</button>
                </div>
            );
            case 'navbar': return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.2rem', color: props.textColor }}>{props.content}</span>
                    <div style={{ display: 'flex', gap: '1.5rem', opacity: 0.8 }}>
                        {['Home', 'About', 'Contact'].map(l => <a key={l} href="#" style={{ color: props.textColor, textDecoration: 'none', fontSize: '0.9rem' }}>{l}</a>)}
                    </div>
                </div>
            );
            case 'footer': return <p style={{ margin: 0, opacity: 0.6, color: props.textColor, textAlign: props.align ?? 'center', fontSize: '0.85rem' }}>{props.content}</p>;
            case 'text': return <p style={{ margin: 0, color: props.textColor, lineHeight: 1.7 }}>{props.content}</p>;
            case 'button': return (
                <div style={{ display: 'flex', justifyContent: props.align ?? 'center' }}>
                    <button style={{ padding: `${(props.padding ?? 16) / 2}px ${props.padding ?? 16}px`, background: props.bgColor, color: props.textColor, border: 'none', borderRadius: `${props.borderRadius ?? 8}px`, cursor: 'pointer', fontWeight: 600 }}>
                        {props.content}
                    </button>
                </div>
            );
            case 'card': return (
                <div style={{ background: props.bgColor, padding: `${props.padding}px`, borderRadius: `${props.borderRadius}px`, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ color: props.textColor, margin: '0 0 0.5rem' }}>{props.content}</h3>
                    <p style={{ color: props.textColor, opacity: 0.6, margin: 0, fontSize: '0.9rem' }}>Card description text here.</p>
                </div>
            );
            case 'features': return (
                <div style={{ textAlign: props.align ?? 'center' }}>
                    <h2 style={{ color: props.textColor, marginBottom: '2rem' }}>{props.content}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {['⚡ Fast', '🔒 Secure', '📱 Mobile-first'].map(f => (
                            <div key={f} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', color: props.textColor, border: '1px solid rgba(255,255,255,0.1)' }}>{f}</div>
                        ))}
                    </div>
                </div>
            );
            case 'form': return (
                <div>
                    <h3 style={{ color: props.textColor, marginBottom: '1.5rem', textAlign: props.align ?? 'left' }}>{props.content}</h3>
                    {['Name', 'Email', 'Message'].map(f => (
                        <div key={f} style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: props.textColor, fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.7 }}>{f}</label>
                            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '10px 12px', color: props.textColor, fontSize: '0.9rem', opacity: 0.4 }}>...</div>
                        </div>
                    ))}
                </div>
            );
            case 'divider': return <hr style={{ border: 'none', borderTop: `1px solid ${props.bgColor ?? '#333'}`, margin: 0 }} />;
            case 'image': return <img src={props.content} alt="canvas block" style={{ width: '100%', borderRadius: `${props.borderRadius ?? 8}px`, display: 'block', objectFit: 'cover' }} />;
            case 'columns': return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    {(props.content ?? 'Col 1|Col 2|Col 3').split('|').map((col, i) => (
                        <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', color: props.textColor, border: '1px solid rgba(255,255,255,0.08)' }}>{col.trim()}</div>
                    ))}
                </div>
            );
            default: return <p style={{ color: props.textColor }}>{props.content}</p>;
        }
    };

    return (
        <div style={baseStyle} onClick={onSelect}>
            {renderContent()}
            {isSelected && (
                <div style={{ position: 'absolute', top: 6, right: 8, background: '#4285f4', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, pointerEvents: 'none' }}>
                    {type}
                </div>
            )}
        </div>
    );
}

export default function BuilderPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading builder...</div>}>
            <BuilderContent />
        </Suspense>
    );
}
