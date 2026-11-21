/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shield: {
          bg: '#080D19',
          sidebar: '#0D1526',
          card: '#111C35',
          cardHover: '#162344',
          border: '#1E293B',
          borderLight: '#334155',
          primary: '#6366F1',
          primaryHover: '#4F46E5',
          accent: '#38BDF8',
          success: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          muted: '#94A3B8',
          text: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
