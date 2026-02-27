/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF3ED',
          100: '#FFE1D0',
          200: '#FFC2A1',
          300: '#FF9E6B',
          400: '#FF6B35',
          500: '#E55A25',
          600: '#C44A1A',
          700: '#A03C15',
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
      },
    },
  },
  plugins: [],
};
