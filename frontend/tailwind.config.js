/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        accent: {
          DEFAULT: '#D946EF',
          warm: '#FF6B35',
        },
        trust: {
          blue: '#0984E3',
        },
        category: {
          food: '#FF6B35',
          lost: '#4ECDC4',
          safety: '#FF1744',
          traffic: '#FFD93D',
          event: '#6C5CE7',
          utility: '#A8DADC',
          noise: '#F4845F',
          free: '#2ECC71',
          official: '#0984E3',
          general: '#636E72',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '24px',
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.06)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.08)',
        glow: '0 0 40px rgba(139, 92, 246, 0.15)',
        'glow-fuchsia': '0 0 40px rgba(217, 70, 239, 0.15)',
      },
    },
  },
  plugins: [],
};
