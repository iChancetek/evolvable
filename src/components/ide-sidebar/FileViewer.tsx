'use client';

import React, { useMemo } from 'react';

interface FileViewerProps {
    filename: string;
    content: string;
    onClose: () => void;
}

function detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        css: 'css', json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
        sh: 'bash', tf: 'hcl', dockerfile: 'dockerfile', py: 'python',
        sql: 'sql', env: 'bash', prisma: 'prisma',
    };
    if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
    return map[ext] || 'plaintext';
}

// Very lightweight token colorizer — no external deps, covers most code patterns
function colorize(code: string, lang: string): React.ReactNode[] {
    const lines = code.split('\n');
    return lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', minHeight: '20px' }}>
            <span style={{
                width: '40px', flexShrink: 0, textAlign: 'right', paddingRight: '16px',
                color: 'rgba(255,255,255,0.18)', userSelect: 'none', fontSize: '0.72rem',
                lineHeight: '20px',
            }}>
                {i + 1}
            </span>
            <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {tokenize(line, lang)}
            </span>
        </div>
    ));
}

function tokenize(line: string, lang: string): React.ReactNode {
    // Comments
    if (/^\s*(\/\/|#|--|\/\*)/.test(line))
        return <span style={{ color: '#6a9955' }}>{line}</span>;
    // Strings (basic double and single quote)
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Very simple keyword highlight for TS/JS/Python
    const keywords = ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await',
        'interface', 'type', 'class', 'extends', 'implements', 'default', 'from', 'if', 'else',
        'try', 'catch', 'throw', 'new', 'null', 'undefined', 'true', 'false', 'void', 'any',
        'string', 'number', 'boolean', 'def', 'import', 'for', 'while', 'in', 'not', 'and', 'or'];

    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    const chunks = remaining.split(kwRegex);
    chunks.forEach((chunk, ci) => {
        if (keywords.includes(chunk)) {
            parts.push(<span key={ci} style={{ color: '#569cd6' }}>{chunk}</span>);
        } else if (chunk) {
            // Highlight strings
            const strSplit = chunk.split(/(["'`][^"'`]*["'`])/g);
            strSplit.forEach((s, si) => {
                if (/^["'`]/.test(s)) {
                    parts.push(<span key={`${ci}-${si}`} style={{ color: '#ce9178' }}>{s}</span>);
                } else {
                    parts.push(<span key={`${ci}-${si}`} style={{ color: '#d4d4d4' }}>{s}</span>);
                }
            });
        }
    });

    return <>{parts}</>;
}

export function FileViewer({ filename, content, onClose }: FileViewerProps) {
    const lang = detectLanguage(filename);
    const rendered = useMemo(() => colorize(content, lang), [content, lang]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#0d0f14',
            fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
        }}>
            {/* Tab bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#080a0e',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                height: '36px',
                flexShrink: 0,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0 1rem',
                    background: '#0d0f14',
                    borderTop: '1px solid #4285f4',
                    height: '100%',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.85)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    marginTop: '-1px',
                }}>
                    <span style={{ color: '#79c0ff' }}>📄</span>
                    {filename.split('/').pop()}
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                {/* Breadcrumb */}
                <div style={{ padding: '0 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                    {filename}
                </div>

                <div style={{ flex: 1 }} />
                <div style={{ padding: '0 1rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>
                    {lang} · Read Only
                </div>
            </div>

            {/* Code content */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '0.75rem 0',
                fontSize: '0.78rem',
                lineHeight: '20px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}>
                {rendered}
            </div>

            {/* Status bar */}
            <div style={{
                height: '22px',
                background: '#4285f4',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                gap: '1rem',
                fontSize: '0.68rem',
                color: '#fff',
                flexShrink: 0,
            }}>
                <span>Ln {rendered.length}</span>
                <span>{lang.toUpperCase()}</span>
                <span>UTF-8</span>
                <span style={{ marginLeft: 'auto' }}>🔒 Read Only</span>
            </div>
        </div>
    );
}
