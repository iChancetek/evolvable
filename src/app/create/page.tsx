'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './create.module.css';
import ProtectedRoute from '@/components/ProtectedRoute';

type Message = {
    id: string;
    role: 'user' | 'ai';
    content: string;
    type?: 'text' | 'options' | 'plan';
    options?: string[];
};

const clarifyingQuestions: { question: string; options: string[] }[] = [
    {
        question: "Great idea! 🎉 Let me ask a few quick questions to get it perfect.\n\nWhat type of app is this?",
        options: ['Booking / Scheduling', 'Online Store', 'Portfolio / Website', 'Community / Social', 'Dashboard / Tool', 'Something else'],
    },
    {
        question: "Who will use this app?",
        options: ['My customers', 'My team', 'Both customers and team', 'The general public'],
    },
    {
        question: "Should users create accounts?",
        options: ['Yes, with full profiles', 'Optional — guest access is fine', 'No accounts needed'],
    },
    {
        question: "Any design preference?",
        options: ['Clean & minimal', 'Bold & colorful', 'Professional & corporate', 'Fun & playful', 'Surprise me ✨'],
    },
];

export default function CreatePage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'ai',
            content: "Hi! I'm Evolvable 👋\n\nTell me about the app you'd like to build. Describe it in your own words — no technical knowledge needed!",
        },
    ]);
    const [input, setInput] = useState('');
    const [questionIndex, setQuestionIndex] = useState(-1);
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

    const simulateAIResponse = (content: string, options?: string[], type?: 'text' | 'options' | 'plan') => {
        setIsTyping(true);
        setTimeout(() => {
            addMessage({
                id: Date.now().toString(),
                role: 'ai',
                content,
                type: type || (options ? 'options' : 'text'),
                options,
            });
            setIsTyping(false);
        }, 1200);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput('');

        addMessage({ id: Date.now().toString(), role: 'user', content: text });

        if (questionIndex === -1) {
            setUserIdea(text);
            setQuestionIndex(0);
            const q = clarifyingQuestions[0];
            simulateAIResponse(q.question, q.options, 'options');
        }
    };

    const handleOptionSelect = (option: string) => {
        addMessage({ id: Date.now().toString(), role: 'user', content: option });

        const nextIndex = questionIndex + 1;
        if (nextIndex < clarifyingQuestions.length) {
            setQuestionIndex(nextIndex);
            const q = clarifyingQuestions[nextIndex];
            simulateAIResponse(q.question, q.options, 'options');
        } else {
            // Show the app plan
            setIsTyping(true);
            setTimeout(() => {
                setShowPlan(true);
                addMessage({
                    id: Date.now().toString(),
                    role: 'ai',
                    content: 'plan',
                    type: 'plan',
                });
                setIsTyping(false);
            }, 2000);
        }
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
                            <div key={msg.id} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
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
                                                <h3>Your App Plan is Ready!</h3>
                                            </div>
                                            <div className={styles.planTitle}>
                                                {userIdea.length > 50 ? userIdea.substring(0, 50) + '...' : userIdea}
                                            </div>
                                            <div className={styles.planFeatures}>
                                                <div className={styles.planFeature}>
                                                    <span>🏠</span> Landing page with hero section
                                                </div>
                                                <div className={styles.planFeature}>
                                                    <span>👤</span> User accounts with profiles
                                                </div>
                                                <div className={styles.planFeature}>
                                                    <span>📝</span> Forms with validation
                                                </div>
                                                <div className={styles.planFeature}>
                                                    <span>📊</span> Admin dashboard
                                                </div>
                                                <div className={styles.planFeature}>
                                                    <span>🔒</span> Secure authentication
                                                </div>
                                                <div className={styles.planFeature}>
                                                    <span>📱</span> Mobile responsive design
                                                </div>
                                            </div>
                                            <div className={styles.planAgents}>
                                                <span>Assigned agents:</span>
                                                <div className={styles.agentBadges}>
                                                    <span className={styles.agentBadge}>💡 Vision</span>
                                                    <span className={styles.agentBadge}>🎨 Design</span>
                                                    <span className={styles.agentBadge}>💻 Code</span>
                                                    <span className={styles.agentBadge}>🧪 Testing</span>
                                                    <span className={styles.agentBadge}>🔒 Security</span>
                                                    <span className={styles.agentBadge}>🚀 Deploy</span>
                                                </div>
                                            </div>
                                            <a href="/builder" className={styles.planButton}>
                                                Start Building →
                                            </a>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.messageText}>
                                                {msg.content.split('\n').map((line, i) => (
                                                    <span key={i}>
                                                        {line}
                                                        {i < msg.content.split('\n').length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </div>
                                            {msg.options && (
                                                <div className={styles.optionsGrid}>
                                                    {msg.options.map((opt, i) => (
                                                        <button
                                                            key={i}
                                                            className={styles.optionButton}
                                                            onClick={() => handleOptionSelect(opt)}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className={`${styles.message} ${styles.aiMessage}`}>
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
            </div>
        </ProtectedRoute>
    );
}
