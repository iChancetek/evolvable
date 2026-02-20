'use client';

import { useState } from 'react';
import styles from './builder.module.css';

const componentLibrary = [
    { icon: '📝', name: 'Text', category: 'Basic' },
    { icon: '🖼️', name: 'Image', category: 'Basic' },
    { icon: '🔘', name: 'Button', category: 'Basic' },
    { icon: '📋', name: 'Form', category: 'Input' },
    { icon: '📧', name: 'Email Input', category: 'Input' },
    { icon: '🔢', name: 'Number Input', category: 'Input' },
    { icon: '📊', name: 'Chart', category: 'Data' },
    { icon: '📈', name: 'Metrics', category: 'Data' },
    { icon: '🗂️', name: 'Table', category: 'Data' },
    { icon: '💳', name: 'Payment', category: 'Commerce' },
    { icon: '🛒', name: 'Cart', category: 'Commerce' },
    { icon: '🗺️', name: 'Map', category: 'Media' },
    { icon: '🎥', name: 'Video', category: 'Media' },
    { icon: '⭐', name: 'Reviews', category: 'Social' },
    { icon: '💬', name: 'Chat', category: 'Social' },
];

const canvasElements = [
    { id: '1', type: 'hero', content: 'Welcome to Your App' },
    { id: '2', type: 'text', content: 'This is your homepage. Drag components to customize it.' },
    { id: '3', type: 'form', content: 'Contact Form' },
    { id: '4', type: 'features', content: 'Feature Grid' },
];

type DeviceView = 'desktop' | 'tablet' | 'mobile';

export default function BuilderPage() {
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
    const [sidebarTab, setSidebarTab] = useState<'components' | 'pages'>('components');

    return (
        <div className={styles.page}>
            {/* Top Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <a href="/" className={styles.toolbarBrand}>
                        <div className={styles.logoMark}>E</div>
                        <span>Evolvable</span>
                    </a>
                    <div className={styles.divider} />
                    <span className={styles.projectName}>My App</span>
                </div>

                <div className={styles.toolbarCenter}>
                    <button className={styles.toolButton} title="Undo">↶</button>
                    <button className={styles.toolButton} title="Redo">↷</button>
                    <div className={styles.deviceToggle}>
                        <button
                            className={`${styles.deviceBtn} ${deviceView === 'desktop' ? styles.active : ''}`}
                            onClick={() => setDeviceView('desktop')}
                            title="Desktop"
                        >🖥️</button>
                        <button
                            className={`${styles.deviceBtn} ${deviceView === 'tablet' ? styles.active : ''}`}
                            onClick={() => setDeviceView('tablet')}
                            title="Tablet"
                        >📱</button>
                        <button
                            className={`${styles.deviceBtn} ${deviceView === 'mobile' ? styles.active : ''}`}
                            onClick={() => setDeviceView('mobile')}
                            title="Mobile"
                        >📲</button>
                    </div>
                </div>

                <div className={styles.toolbarRight}>
                    <button className={styles.previewBtn}>Preview</button>
                    <a href="/deploy" className={styles.deployBtn}>
                        🚀 Deploy
                    </a>
                </div>
            </div>

            <div className={styles.workspace}>
                {/* Left Sidebar — Component Palette */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarTabs}>
                        <button
                            className={`${styles.tabBtn} ${sidebarTab === 'components' ? styles.activeTab : ''}`}
                            onClick={() => setSidebarTab('components')}
                        >Components</button>
                        <button
                            className={`${styles.tabBtn} ${sidebarTab === 'pages' ? styles.activeTab : ''}`}
                            onClick={() => setSidebarTab('pages')}
                        >Pages</button>
                    </div>

                    {sidebarTab === 'components' ? (
                        <div className={styles.componentList}>
                            {componentLibrary.map((comp, i) => (
                                <div key={i} className={styles.componentItem} draggable>
                                    <span className={styles.compIcon}>{comp.icon}</span>
                                    <span className={styles.compName}>{comp.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.pageList}>
                            <div className={`${styles.pageItem} ${styles.activePage}`}>
                                <span>🏠</span> Homepage
                            </div>
                            <div className={styles.pageItem}>
                                <span>👤</span> Login
                            </div>
                            <div className={styles.pageItem}>
                                <span>📊</span> Dashboard
                            </div>
                            <div className={styles.pageItem}>
                                <span>📝</span> Contact
                            </div>
                            <button className={styles.addPageBtn}>+ Add Page</button>
                        </div>
                    )}
                </aside>

                {/* Canvas */}
                <main className={styles.canvas}>
                    <div className={`${styles.canvasFrame} ${styles[deviceView]}`}>
                        <div className={styles.canvasContent}>
                            {/* Simulated app preview */}
                            <div className={styles.previewNav}>
                                <span className={styles.previewLogo}>MyApp</span>
                                <div className={styles.previewNavLinks}>
                                    <span>Home</span>
                                    <span>About</span>
                                    <span>Contact</span>
                                </div>
                            </div>

                            {canvasElements.map((el) => (
                                <div
                                    key={el.id}
                                    className={`${styles.canvasElement} ${selectedElement === el.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedElement(el.id)}
                                >
                                    {el.type === 'hero' && (
                                        <div className={styles.previewHero}>
                                            <h1>{el.content}</h1>
                                            <p>Build something amazing today</p>
                                            <button className={styles.previewCta}>Get Started</button>
                                        </div>
                                    )}
                                    {el.type === 'text' && (
                                        <div className={styles.previewText}>
                                            <p>{el.content}</p>
                                        </div>
                                    )}
                                    {el.type === 'form' && (
                                        <div className={styles.previewForm}>
                                            <h3>{el.content}</h3>
                                            <div className={styles.formField}>
                                                <div className={styles.fieldLabel}>Name</div>
                                                <div className={styles.fieldInput} />
                                            </div>
                                            <div className={styles.formField}>
                                                <div className={styles.fieldLabel}>Email</div>
                                                <div className={styles.fieldInput} />
                                            </div>
                                            <div className={styles.formField}>
                                                <div className={styles.fieldLabel}>Message</div>
                                                <div className={`${styles.fieldInput} ${styles.fieldTextarea}`} />
                                            </div>
                                            <div className={styles.formSubmit}>Send Message</div>
                                        </div>
                                    )}
                                    {el.type === 'features' && (
                                        <div className={styles.previewFeatures}>
                                            <h3>Features</h3>
                                            <div className={styles.featureCards}>
                                                <div className={styles.fCard}><span>⚡</span> Fast</div>
                                                <div className={styles.fCard}><span>🔒</span> Secure</div>
                                                <div className={styles.fCard}><span>📱</span> Mobile</div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedElement === el.id && (
                                        <div className={styles.selectionOverlay}>
                                            <span className={styles.selectionLabel}>{el.type}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Right Panel — Properties */}
                {selectedElement && (
                    <aside className={styles.propertiesPanel}>
                        <h3 className={styles.propTitle}>Properties</h3>
                        <div className={styles.propGroup}>
                            <label>Content</label>
                            <input type="text" className={styles.propInput} defaultValue={canvasElements.find(e => e.id === selectedElement)?.content} />
                        </div>
                        <div className={styles.propGroup}>
                            <label>Background</label>
                            <div className={styles.colorPicker}>
                                <div className={styles.colorSwatch} style={{ background: '#4285f4' }} />
                                <div className={styles.colorSwatch} style={{ background: '#a855f7' }} />
                                <div className={styles.colorSwatch} style={{ background: '#06b6d4' }} />
                                <div className={styles.colorSwatch} style={{ background: '#ec4899' }} />
                                <div className={styles.colorSwatch} style={{ background: '#ffffff' }} />
                            </div>
                        </div>
                        <div className={styles.propGroup}>
                            <label>Padding</label>
                            <input type="range" min="0" max="80" defaultValue="24" className={styles.propRange} />
                        </div>
                        <div className={styles.propGroup}>
                            <label>Border Radius</label>
                            <input type="range" min="0" max="40" defaultValue="12" className={styles.propRange} />
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
