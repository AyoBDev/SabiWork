// dashboard/tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dash-bg': '#0A0A0A',
        'dash-surface': '#1A1A1A',
        'dash-border': '#2A2A2A',
        'dash-text': '#F5F5F5',
        'dash-muted': '#AAAAAA',
        'sabi-green': '#1B7A3D',
        'work-orange': '#E8630A',
        'cash-gold': '#F9A825',
        'alert-red': '#D32F2F'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
