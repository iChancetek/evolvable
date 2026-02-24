import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                editor: {
                    DEFAULT: '#0d0f14',
                    surface: '#12151c',
                    elevated: '#1a1f2e',
                    border: 'rgba(255,255,255,0.07)',
                },
                brand: {
                    blue: '#4285f4',
                    purple: '#a855f7',
                    teal: '#06b6d4',
                    green: '#22c55e',
                    red: '#ef4444',
                    amber: '#f59e0b',
                },
                glow: {
                    blue: 'rgba(66,133,244,0.4)',
                    purple: 'rgba(168,85,247,0.4)',
                    teal: 'rgba(6,182,212,0.4)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
            },
            animation: {
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                'scan-line': 'scan-line 3s linear infinite',
                'text-shimmer': 'text-shimmer 2s linear infinite',
                'slide-up': 'slide-up 0.4s cubic-bezier(0.16,1,0.3,1) both',
                'fade-in': 'fade-in 0.3s ease both',
            },
            keyframes: {
                'glow-pulse': {
                    '0%,100%': { boxShadow: '0 0 20px rgba(66,133,244,0.2)' },
                    '50%': { boxShadow: '0 0 40px rgba(66,133,244,0.5), 0 0 80px rgba(168,85,247,0.2)' },
                },
                'scan-line': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                'text-shimmer': {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-mesh': 'linear-gradient(135deg, var(--tw-gradient-stops))',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};

export default config;
