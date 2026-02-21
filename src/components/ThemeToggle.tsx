'use client';

import { useTheme } from '@/lib/theme/theme-context';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid rgba(128, 128, 128, 0.15)',
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                cursor: 'pointer',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '18px',
            }}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
}
