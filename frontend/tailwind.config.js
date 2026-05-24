/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f5f3ef',
          100: '#e8e3d8',
          200: '#d4cbb8',
          300: '#b8a98e',
          400: '#9c8768',
          500: '#7a6548',
          600: '#5e4d36',
          700: '#433726',
          800: '#2a2218',
          900: '#14100c',
        },
        paper: {
          50: '#fdfcf8',
          100: '#f9f6ef',
          200: '#f2ece0',
          300: '#e8dfc9',
        },
        accent: {
          400: '#e8734a',
          500: '#d4562e',
          600: '#b8431e',
        },
        emerald: {
          400: '#4ade80',
          500: '#22c55e',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
