/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cat: {
          yellow:  '#FFB81C',
          yellow2: '#E6A400',
          black:   '#000000',
          dark:    '#111111',
          darker:  '#0a0a0a',
          gray:    '#1a1a1a',
          border:  '#252525',
          muted:   '#6B6B6B',
          text:    '#E8E8E8',
          panel:   '#141414',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'cat-grid':    "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%23FFB81C' stroke-opacity='0.04' stroke-width='1'/%3E%3C/svg%3E\")",
        'cat-stripe':  "repeating-linear-gradient(45deg, #FFB81C 0px, #FFB81C 4px, #000 4px, #000 20px)",
      },
      boxShadow: {
        'cat':     '0 0 20px rgba(255,184,28,0.15)',
        'cat-lg':  '0 0 40px rgba(255,184,28,0.2)',
        'cat-glow':'0 0 60px rgba(255,184,28,0.3)',
        'inner-cat':'inset 0 1px 0 rgba(255,184,28,0.1)',
      },
      animation: {
        'pulse-cat': 'pulse-cat 2s ease-in-out infinite',
        'slide-up':  'slide-up 0.3s ease-out',
        'glow':      'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-cat': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,184,28,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(255,184,28,0)' },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'glow': {
          '0%,100%': { opacity: 0.6 },
          '50%':     { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
