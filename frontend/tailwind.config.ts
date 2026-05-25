import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050508',
          secondary: '#0c0c14',
          tertiary: '#111120',
          elevated: '#16162a',
          glass: 'rgba(255,255,255,0.025)',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
          violet: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          bright: 'rgba(255,255,255,0.13)',
          accent: 'rgba(99,102,241,0.35)',
        },
        status: {
          online: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'Menlo', 'monospace'],
        display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in-down': 'fadeInDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'gradient-shift': 'gradientShift 12s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'counter': 'counter 1.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'draw-line': 'drawLine 1.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(99,102,241,0.2), 0 0 40px rgba(99,102,241,0.1)' },
          to: { boxShadow: '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(139,92,246,0.2)' },
        },
        counter: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        drawLine: {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-lg': '0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-xl': '0 16px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
        'glow-sm': '0 0 16px rgba(99,102,241,0.2)',
        'glow': '0 0 32px rgba(99,102,241,0.25)',
        'glow-lg': '0 0 64px rgba(99,102,241,0.3)',
        'glow-success': '0 0 24px rgba(16,185,129,0.2)',
        'glow-danger': '0 0 24px rgba(239,68,68,0.2)',
        'glow-warning': '0 0 24px rgba(245,158,11,0.2)',
        'inner': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
        'panel': '0 2px 8px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        'gradient-accent-h': 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        'gradient-warm': 'linear-gradient(135deg, #f59e0b, #ef4444)',
        'gradient-cool': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
        'gradient-success': 'linear-gradient(135deg, #10b981, #059669)',
        'mesh-bg': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 90% 90%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 10% 80%, rgba(6,182,212,0.06) 0%, transparent 55%)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
