import { NextRequest, NextResponse } from 'next/server';
import { VisualLayout, CanvasNode, CanvasPage } from '@/lib/agents/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/export-code
 * Accepts a VisualLayout AST and converts it to Next.js JSX file strings.
 * Returns: { files: Record<string, string> }
 */
export async function POST(req: NextRequest) {
    try {
        const { layout }: { layout: VisualLayout } = await req.json();

        if (!layout?.pages?.length) {
            return NextResponse.json({ error: 'No layout provided' }, { status: 400 });
        }

        const files: Record<string, string> = {};

        // Generate a page file for each canvas page
        for (const page of layout.pages) {
            const filePath = page.path === '/' ? 'src/app/page.tsx' : `src/app${page.path}/page.tsx`;
            files[filePath] = generatePageFile(page);
        }

        // Generate a shared globals.css with the project's color tokens
        files['src/app/globals.css'] = generateGlobalCSS(layout);

        return NextResponse.json({ files, pageCount: layout.pages.length });

    } catch (error: any) {
        console.error('[Export Code] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

function generatePageFile(page: CanvasPage): string {
    const componentImports = new Set<string>();
    const jsxBlocks = page.nodes.map(node => nodeToJSX(node, componentImports)).join('\n\n');

    return `import React from 'react';

export default function ${toPascalCase(page.title)}Page() {
    return (
        <main style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
${jsxBlocks}
        </main>
    );
}
`;
}

function nodeToJSX(node: CanvasNode, imports: Set<string>): string {
    const { type, props } = node;
    const style = buildStyle(props);

    switch (type) {
        case 'hero':
            return `            {/* Hero — ${node.id} */}
            <section style={${style}}>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, margin: '0 0 1rem', color: '${props.textColor}' }}>
                    ${escapeJSXText(props.content ?? 'Welcome')}
                </h1>
                <p style={{ opacity: 0.7, color: '${props.textColor}' }}>Built with Evolvable AI.</p>
                <button style={{ marginTop: '2rem', padding: '12px 32px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    Get Started →
                </button>
            </section>`;

        case 'navbar':
            return `            {/* Navbar — ${node.id} */}
            <nav style={${style}}>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '${props.textColor}' }}>${escapeJSXText(props.content ?? 'MyApp')}</span>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <a href="/" style={{ color: '${props.textColor}', textDecoration: 'none' }}>Home</a>
                    <a href="/about" style={{ color: '${props.textColor}', textDecoration: 'none' }}>About</a>
                    <a href="/contact" style={{ color: '${props.textColor}', textDecoration: 'none' }}>Contact</a>
                </div>
            </nav>`;

        case 'footer':
            return `            {/* Footer — ${node.id} */}
            <footer style={${style}}>
                <p style={{ margin: 0, opacity: 0.6, color: '${props.textColor}', fontSize: '0.85rem' }}>
                    ${escapeJSXText(props.content ?? '© 2026')}
                </p>
            </footer>`;

        case 'text':
            return `            {/* Text — ${node.id} */}
            <div style={${style}}>
                <p style={{ margin: 0, color: '${props.textColor}', lineHeight: 1.7 }}>
                    ${escapeJSXText(props.content ?? '')}
                </p>
            </div>`;

        case 'button':
            return `            {/* Button — ${node.id} */}
            <div style={{ ...${style}, display: 'flex', justifyContent: '${props.align ?? 'center'}' }}>
                <a href="${props.href ?? '#'}" style={{ display: 'inline-block', padding: '12px 24px', background: '${props.bgColor}', color: '${props.textColor}', borderRadius: '${props.borderRadius ?? 8}px', fontWeight: 600, textDecoration: 'none' }}>
                    ${escapeJSXText(props.content ?? 'Click Me')}
                </a>
            </div>`;

        case 'card':
            return `            {/* Card — ${node.id} */}
            <div style={${style}}>
                <h3 style={{ color: '${props.textColor}', margin: '0 0 0.5rem' }}>${escapeJSXText(props.content ?? 'Card')}</h3>
                <p style={{ color: '${props.textColor}', opacity: 0.6, margin: 0 }}>Card description goes here.</p>
            </div>`;

        case 'features':
            return `            {/* Features — ${node.id} */}
            <section style={${style}}>
                <h2 style={{ color: '${props.textColor}', textAlign: '${props.align ?? 'center'}', marginBottom: '2rem' }}>${escapeJSXText(props.content ?? 'Features')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {['⚡ Fast', '🔒 Secure', '📱 Mobile-first'].map(f => (
                        <div key={f} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: '${props.textColor}' }}>{f}</div>
                    ))}
                </div>
            </section>`;

        case 'form':
            return `            {/* Form — ${node.id} */}
            <section style={${style}}>
                <h3 style={{ color: '${props.textColor}', marginBottom: '1.5rem' }}>${escapeJSXText(props.content ?? 'Contact Us')}</h3>
                <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="text" placeholder="Name" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '${props.textColor}' }} />
                    <input type="email" placeholder="Email" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '${props.textColor}' }} />
                    <textarea placeholder="Message" rows={4} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '${props.textColor}', resize: 'vertical' }} />
                    <button type="submit" style={{ padding: '12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Send Message</button>
                </form>
            </section>`;

        case 'divider':
            return `            {/* Divider — ${node.id} */}
            <hr style={{ border: 'none', borderTop: '1px solid ${props.bgColor ?? '#333'}', margin: 0 }} />`;

        case 'image':
            return `            {/* Image — ${node.id} */}
            <div style={${style}}>
                <img src="${props.content}" alt="section image" style={{ width: '100%', borderRadius: '${props.borderRadius ?? 8}px', display: 'block' }} />
            </div>`;

        default:
            return `            {/* ${type} — ${node.id} */}
            <div style={${style}}><p>${escapeJSXText(props.content ?? '')}</p></div>`;
    }
}

function buildStyle(props: Record<string, any>): string {
    const parts: string[] = [
        `backgroundColor: '${props.bgColor ?? 'transparent'}'`,
        `padding: '${props.padding ?? 24}px'`,
    ];
    if (props.borderRadius) parts.push(`borderRadius: '${props.borderRadius}px'`);
    if (props.textAlign) parts.push(`textAlign: '${props.textAlign}'`);
    return `{ ${parts.join(', ')} }`;
}

function generateGlobalCSS(layout: VisualLayout): string {
    return `/* Generated by Evolvable Visual Builder */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0a; color: #e8eaed; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
`;
}

function toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w|\s\w)/g, m => m.replace(/[-\s]/, '').toUpperCase());
}

function escapeJSXText(str: string): string {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
}
