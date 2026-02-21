'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './create.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useOrchestration } from '@/lib/hooks/useOrchestration';
import { useAuth } from '@/lib/auth/auth-context';

type Message = {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type?: 'text' | 'options' | 'plan';
    options?: string[];
};



export default function CreatePage() {
    const { user } = useAuth();
    const { startPipeline, blueprint, isLoading: isOrchestrating, projectId } = useOrchestration();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'ai',
            content: "Hi! I'm Evolvable 👋\n\nTell me about the app you'd like to build. Describe it in your own words — no technical knowledge needed!",
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showPlan, setShowPlan] = useState(false);
    const [userIdea, setUserIdea] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const addMessage = (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
    };

    const simulateAIResponse = (content: string, type?: 'text' | 'plan') => {
        setIsTyping(true);
        setTimeout(() => {
            addMessage({
                id: Date.now().toString(),
                role: 'ai',
                content,
                type: type || 'text',
            });
            setIsTyping(false);
        }, 1200);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');

        addMessage({ id: Date.now().toString(), role: 'user', content: text });
        setUserIdea(text);
        setIsTyping(true);

        // Start the pipeline in the background using the real backend
        startPipeline(text, user?.uid || 'anonymous').then(() => {
            setShowPlan(true);
            addMessage({
                id: Date.now().toString(),
                role: 'ai',
                content: 'plan',
                type: 'plan',
            });
            setIsTyping(false);
        }).catch(err => {
            console.error("Pipeline failed", err);
            setIsTyping(false);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <ProtectedRoute>
            <div className={styles.page}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <a href="/" className={styles.backLink}>
                        <span className={styles.backArrow}>←</span>
                        <div className={styles.sidebarBrand}>
                            <div className={styles.logoMark}>E</div>
                            <span>Evolvable</span>
                        </div>
                    </a>
                    <div className={styles.sidebarSection}>
                        <h3>Your Projects</h3>
                        <div className={styles.projectItem}>
                            <span className={styles.projectDot} style={{ background: 'var(--color-accent-green)' }} />
                            <span>New Project</span>
                        </div>
                    </div>
                    <div className={styles.sidebarFooter}>
                        <div className={styles.agentStatus}>
                            <div className={styles.statusDot} />
                            <span>AI Agents Ready</span>
                        </div>
                    </div>
                </aside>

                {/* Chat Area */}
                <main className={styles.chatArea}>
                    <div className={styles.chatHeader}>
                        <h1>Create Your App</h1>
                        <p>Describe your idea and our AI will build it for you</p>
                    </div>

                    <div className={styles.messagesContainer}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage} `}>
                                {msg.role === 'ai' && (
                                    <div className={styles.avatar}>
                                        <div className={styles.avatarInner}>E</div>
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    {msg.type === 'plan' ? (
                                        <div className={styles.planCard}>
                                            <div className={styles.planHeader}>
                                                <span className={styles.planCheck}>✅</span>
                                                <h3>{blueprint?.prd ? 'App Plan Generated!' : 'Generating App Plan...'}</h3>
                                            </div>
                                            <div className={styles.planTitle}>
                                                {blueprint?.prd?.title || (userIdea.length > 50 ? userIdea.substring(0, 50) + '...' : userIdea)}
                                            </div>

                                            {blueprint?.prd && (
                                                <div className={styles.planFeatures}>
                                                    {blueprint.prd.features.slice(0, 6).map((feat, idx) => (
                                                        <div key={idx} className={styles.planFeature}>
                                                            <span>✨</span> {feat.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {!blueprint?.prd && (
                                                <div className={styles.typingIndicator} style={{ margin: '1rem 0', justifyContent: 'flex-start' }}>
                                                    <span /><span /><span />
                                                </div>
                                            )}

                                            {blueprint?.codebase?.files && Object.keys(blueprint.codebase.files).length > 0 && (
                                                <div className={styles.codePreview}>
                                                    <div className={styles.codeHeader}>
                                                        <span>Generated Codebase</span>
                                                        <span className={styles.codeBadge}>{Object.keys(blueprint.codebase.files).length} files</span>
                                                    </div>
                                                    <div className={styles.fileList}>
                                                        {Object.entries(blueprint.codebase.files).slice(0, 5).map(([filename, content]) => (
                                                            <div key={filename} className={styles.fileItem}>
                                                                <div className={styles.fileName}>
                                                                    <span>📄</span> {filename}
                                                                </div>
                                                                <pre className={styles.fileContent}>
                                                                    <code>{typeof content === 'string' ? content.substring(0, 300) + (content.length > 300 ? '\n...' : '') : ''}</code>
                                                                </pre>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.planAgents}>
                                                <span>Pipeline Status: {blueprint?.status === 'building' ? 'Building...' : blueprint?.status === 'deployed' ? 'Complete!' : 'Initializing'}</span>
                                                <div className={styles.agentBadges}>
                                                    <span className={`${styles.agentBadge} ${blueprint?.currentPhase === 'vision' ? styles.agentActive : ''}`}>💡 Vision</span>
                                                    <span className={`${styles.agentBadge} ${['ui_designer', 'db_architect', 'system_architect'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>🎨 Design & Arch</span>
                                                    <span className={`${styles.agentBadge} ${blueprint?.currentPhase === 'code_generation' ? styles.agentActive : ''}`}>💻 Code Gen</span>
                                                    <span className={`${styles.agentBadge} ${['qa_testing', 'security', 'debug_optimize'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>🧪 QA & Security</span>
                                                    <span className={`${styles.agentBadge} ${blueprint?.currentPhase === 'deployment' ? styles.agentActive : ''}`}>🚀 Deploy</span>
                                                </div>
                                            </div>
                                            <a
                                                href={projectId ? `/builder?projectId=${projectId}` : '#'}
                                                className={`${styles.planButton} ${!blueprint?.prd ? styles.planButtonDisabled : ''}`}
                                                style={{ pointerEvents: !blueprint?.prd ? 'none' : 'auto', opacity: !blueprint?.prd ? 0.5 : 1 }}
                                            >
                                                Start Building →
                                            </a>
                                        </div>
                                    ) : (
                                        <div className={styles.messageText}>
                                            {msg.content.split('\n').map((line, i) => (
                                                <span key={i}>
                                                    {line}
                                                    {i < msg.content.split('\n').length - 1 && <br />}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className={`${styles.message} ${styles.aiMessage} `}>
                                <div className={styles.avatar}>
                                    <div className={styles.avatarInner}>E</div>
                                </div>
                                <div className={styles.messageContent}>
                                    <div className={styles.typingIndicator}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className={styles.inputArea}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                className={styles.chatInput}
                                placeholder="Describe your app idea..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={showPlan}
                            />
                            <button
                                className={styles.sendButton}
                                onClick={handleSend}
                                disabled={!input.trim() || showPlan}
                            >
                                <span>→</span>
                            </button>
                        </div>
                        <p className={styles.inputHint}>
                            💡 Tip: Be descriptive! "I want a booking app for my salon" works great.
                        </p>
                    </div>
                </main>
            </div >
        </ProtectedRoute >
    );
}
