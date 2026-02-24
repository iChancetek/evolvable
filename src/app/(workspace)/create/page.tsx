'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './create.module.css';
import { useOrchestration } from '@/lib/hooks/useOrchestration';
import { useAuth } from '@/lib/auth/auth-context';
import { LLMProvider } from '@/lib/agents/types';

type Message = {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type?: 'text' | 'options' | 'plan';
    options?: string[];
};



export default function CreatePage() {
    const { user } = useAuth();
    const { startPipeline, abortPipeline, blueprint, isLoading: isOrchestrating, projectId } = useOrchestration();

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
    const [provider, setProvider] = useState<LLMProvider>('openai');
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
        startPipeline(text, user?.uid || 'anonymous', provider).then((newProjectId) => {
            if (!newProjectId) {
                addMessage({
                    id: Date.now().toString(),
                    role: 'ai',
                    content: 'An error occurred while initializing the AI Orchestration layer. Please check the logs.',
                });
                setIsTyping(false);
                return;
            }

            setShowPlan(true);
            addMessage({
                id: Date.now().toString(),
                role: 'ai',
                content: 'plan',
                type: 'plan',
            });
            setIsTyping(false);
        }).catch(err => {
            console.error("Pipeline Promise rejection", err);
            addMessage({
                id: Date.now().toString(),
                role: 'ai',
                content: `Error: ${err.message}`,
            });
            setIsTyping(false);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const PIPELINE_PHASES = [
        { key: 'nlii', label: 'Infrastructure Setup', icon: '⚙️' },
        { key: 'vision', label: 'PRD & Vision', icon: '📋' },
        { key: 'ui_designer', label: 'UI Design System', icon: '🎨' },
        { key: 'db_architect', label: 'Database Schema', icon: '🗄️' },
        { key: 'system_architect', label: 'Architecture Plan', icon: '🏗️' },
        { key: 'code_generation', label: 'Code Generation', icon: '💻' },
        { key: 'qa_testing', label: 'QA & Testing', icon: '🧪' },
        { key: 'deployment', label: 'Deployment', icon: '🚀' },
    ];

    const getPhaseStatus = (key: string) => {
        const logs = blueprint?.pipelineLogs || [];
        const phaseLog = logs.find(l => l.agentId === key);
        if (!phaseLog) return 'pending';
        return phaseLog.status === 'completed' ? 'done' : phaseLog.status === 'failed' ? 'error' : 'active';
    };

    return (
        <div className={styles.page}>
            {/* VS Code-style Explorer Sidebar */}
            <aside className={styles.sidebar}>
                {/* Sidebar Header */}
                <div style={{ padding: '0 0 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.5rem 0.75rem' }}>
                        Explorer
                    </div>
                    <a href="/dashboard" className={styles.backLink}>
                        ← Dashboard
                    </a>
                </div>

                {/* Project Tree */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {/* Section: Active Project */}
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.5rem' }}>▼</span> New Project
                    </div>

                    {/* Pipeline Phases as File Tree */}
                    {PIPELINE_PHASES.map((phase) => {
                        const status = getPhaseStatus(phase.key);
                        const statusColor = status === 'done' ? '#4ade80' : status === 'active' ? '#60a5fa' : status === 'error' ? '#f87171' : 'rgba(255,255,255,0.2)';
                        return (
                            <div key={phase.key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.3rem 0.75rem 0.3rem 1.25rem',
                                fontSize: '0.78rem',
                                color: status === 'pending' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
                                transition: 'background 0.15s',
                                cursor: 'default',
                                borderLeft: status === 'active' ? '2px solid #4285f4' : '2px solid transparent',
                                background: status === 'active' ? 'rgba(66,133,244,0.07)' : 'transparent',
                            }}>
                                <span style={{ fontSize: '0.65rem', color: statusColor, flexShrink: 0 }}>
                                    {status === 'done' ? '●' : status === 'active' ? '◉' : status === 'error' ? '✗' : '○'}
                                </span>
                                <span style={{ fontSize: '0.75rem' }}>{phase.icon}</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{phase.label}</span>
                            </div>
                        );
                    })}

                    {/* Project ID if running */}
                    {projectId && (
                        <div style={{ margin: '0.75rem', padding: '0.625rem', background: 'rgba(66,133,244,0.06)', borderRadius: '6px', border: '1px solid rgba(66,133,244,0.12)' }}>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Project ID</div>
                            <div style={{ fontSize: '0.68rem', color: '#79c0ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>{projectId.substring(0, 16)}...</div>
                        </div>
                    )}
                </div>

                {/* Footer: AI Status */}
                <div className={styles.sidebarFooter}>
                    <div className={styles.agentStatus}>
                        <div className={styles.statusDot} />
                        <span>{blueprint?.status === 'building' ? 'Building...' : blueprint?.status === 'awaiting_clarification' ? 'Needs Input' : blueprint?.status === 'awaiting_approval' ? 'Ready for Review' : blueprint?.status === 'deployed' ? 'Deployed ✓' : 'AI Agents Ready'}</span>
                    </div>
                </div>
            </aside>


            {/* Chat Area */}
            <main className={styles.chatArea}>
                {/* VS Code Tab Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: '#080a0e',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    height: '38px',
                    flexShrink: 0,
                }}>
                    {/* Active Tab */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0 1.25rem',
                        background: '#0d0f14',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                        borderTop: '1px solid #4285f4',
                        fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.85)',
                        fontWeight: 500,
                        marginTop: '-1px',
                    }}>
                        <span style={{ color: '#79c0ff', fontSize: '0.7rem' }}>💬</span>
                        new-project.chat
                    </div>
                    {/* Tab Bar Right: controls */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1rem', gap: '0.75rem' }}>
                        {blueprint?.status === 'building' && (
                            <button
                                onClick={abortPipeline}
                                style={{ padding: '0.2rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                ■ Stop
                            </button>
                        )}
                        {blueprint?.status === 'awaiting_approval' && projectId && (
                            <a
                                href={`/plan-review?projectId=${projectId}`}
                                style={{ padding: '0.2rem 0.875rem', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.1)', color: '#c084fc', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'none', fontWeight: 600 }}
                            >
                                Review Plan →
                            </a>
                        )}
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)' }}>
                            Next.js 15 · React 19
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage} `}>
                            {msg.role === 'ai' && (
                                <div className={styles.avatar}>
                                    <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.avatarInner} />
                                </div>
                            )}
                            <div className={styles.messageContent}>
                                {msg.type === 'plan' ? (
                                    <div className={styles.planCard}>
                                        <div className={styles.planHeader}>
                                            {blueprint?.status === 'awaiting_clarification' ? (
                                                <>
                                                    <span className={styles.planCheck}>⚠️</span>
                                                    <h3>Clarification Needed</h3>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={styles.planCheck}>✅</span>
                                                    <h3>{blueprint?.prd ? 'App Plan Generated!' : 'Generating App Plan...'}</h3>
                                                </>
                                            )}
                                        </div>
                                        <div className={styles.planTitle}>
                                            {blueprint?.prd?.title || (userIdea.length > 50 ? userIdea.substring(0, 50) + '...' : userIdea)}
                                        </div>

                                        {(() => {
                                            const features = Array.isArray(blueprint?.prd?.features) ? blueprint.prd.features : [];
                                            if (features.length === 0) return null;
                                            return (
                                                <div className={styles.planFeatures}>
                                                    {features.slice(0, 6).map((feat: any, idx: number) => (
                                                        <div key={idx} className={styles.planFeature}>
                                                            <span>✨</span> {feat?.title || 'Feature'}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {blueprint?.pipelineLogs && blueprint.pipelineLogs.length > 0 && (
                                            <div className={styles.terminalContainer}>
                                                <div className={styles.terminalHeader}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {blueprint.status === 'building' && <div className={styles.terminalPulse} />}
                                                        <span>Agent Execution Stream</span>
                                                    </div>
                                                    <span style={{ color: '#666', fontSize: '10px' }}>{blueprint.pipelineLogs.length} events</span>
                                                </div>
                                                <div className={styles.terminalLogs}>
                                                    {blueprint.pipelineLogs.map((log, idx) => (
                                                        <div key={idx} className={styles.logLine}>
                                                            <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                            <span className={styles.logAgent}>[{log.agentId}]</span>
                                                            <span className={styles.logMessage} style={{ color: log.status === 'failed' ? '#f48771' : log.status === 'completed' ? '#89d185' : '#d4d4d4' }}>
                                                                {log.message}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {blueprint.status === 'awaiting_clarification' && (
                                                        <div className={styles.logLine} style={{ marginTop: '12px', padding: '12px', background: 'rgba(244, 135, 113, 0.1)', border: '1px solid rgba(244, 135, 113, 0.3)', borderRadius: '6px' }}>
                                                            <span className={styles.logTime}>⚠️ AI Paused</span>
                                                            <span className={styles.logMessage} style={{ color: '#f48771', fontWeight: 600 }}>
                                                                The pipeline requires user input to proceed. Please click the "Review & Clarify →" button below to answer the AI's questions.
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
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
                                            <span>Pipeline Status: {
                                                blueprint?.status === 'building' ? 'Building...' :
                                                    blueprint?.status === 'deployed' ? 'Complete!' :
                                                        blueprint?.status === 'awaiting_clarification' ? 'Needs Clarification' :
                                                            blueprint?.status === 'awaiting_approval' ? 'Awaiting Approval' :
                                                                'Initializing'
                                            }</span>
                                            <div className={styles.agentBadges}>
                                                <span className={`${styles.agentBadge} ${['vision', 'nlii', 'nldi', 'plan_coordinator'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>💡 Vision</span>
                                                <span className={`${styles.agentBadge} ${['ui_designer', 'db_architect', 'system_architect'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>🎨 Design & Arch</span>
                                                <span className={`${styles.agentBadge} ${['code_generation', 'backend_generation', 'logic_builder'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>💻 Code Gen</span>
                                                <span className={`${styles.agentBadge} ${['qa_testing', 'security', 'debug_optimize'].includes(blueprint?.currentPhase || '') ? styles.agentActive : ''}`}>🧪 QA & Security</span>
                                                <span className={`${styles.agentBadge} ${blueprint?.currentPhase === 'deployment' ? styles.agentActive : ''}`}>🚀 Deploy</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                            {blueprint?.status === 'awaiting_clarification' ? (
                                                <a
                                                    href={`/plan-review?projectId=${projectId}`}
                                                    className={styles.planButton}
                                                    style={{ background: 'var(--color-accent-red)', flex: 1 }}
                                                >
                                                    Review & Clarify →
                                                </a>
                                            ) : (
                                                <a
                                                    href={projectId ? `/builder?projectId=${projectId}` : '#'}
                                                    className={`${styles.planButton} ${!blueprint?.prd ? styles.planButtonDisabled : ''}`}
                                                    style={{ pointerEvents: !blueprint?.prd ? 'none' : 'auto', opacity: !blueprint?.prd ? 0.5 : 1, flex: 1 }}
                                                >
                                                    Start Building →
                                                </a>
                                            )}
                                            {blueprint?.status === 'building' && (
                                                <button
                                                    onClick={() => abortPipeline()}
                                                    className={styles.planButton}
                                                    style={{ background: 'var(--color-accent-red)', flex: 0.5 }}
                                                >
                                                    Cancel Build
                                                </button>
                                            )}
                                        </div>
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
                                <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.avatarInner} />
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
                    {!showPlan && (
                        <div className={styles.modelSelector}>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginRight: '4px', alignSelf: 'center', fontWeight: 600 }}>AI Brain:</span>
                            <button
                                className={`${styles.modelButton} ${provider === 'openai' ? styles.modelButtonActive : ''}`}
                                onClick={() => setProvider('openai')}
                            >
                                ✨ OpenAI (GPT-5.2)
                            </button>
                            <button
                                className={`${styles.modelButton} ${provider === 'deepseek' ? styles.modelButtonActive : ''}`}
                                onClick={() => setProvider('deepseek')}
                            >
                                🐋 DeepSeek (V3.2)
                            </button>
                            <button
                                className={`${styles.modelButton} ${provider === 'huggingface' ? styles.modelButtonActive : ''}`}
                                onClick={() => setProvider('huggingface')}
                            >
                                🤗 Hugging Face (Qwen)
                            </button>
                            <button
                                className={`${styles.modelButton} ${provider === 'anthropic' ? styles.modelButtonActive : ''}`}
                                onClick={() => setProvider('anthropic')}
                            >
                                🧠 Claude (4.6)
                            </button>
                        </div>
                    )}
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
    );
}
