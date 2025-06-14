/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bull-green': '#10b981',
        'bear-red': '#ef4444',
        'neutral-blue': '#3b82f6',
        'financial-gray': '#6b7280',
        'dashboard-bg': '#f8fafc',
      },
      fontFamily: {
        'financial': ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
} 