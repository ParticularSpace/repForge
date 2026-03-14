import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 50: '#f0f9ff', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' } },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(40px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        'slide-in-left':  { from: { transform: 'translateX(-40px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 180ms ease-out',
        'slide-in-left':  'slide-in-left 180ms ease-out',
      },
    },
  },
  plugins: []
} satisfies Config
