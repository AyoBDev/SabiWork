// pwa/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'sabi-green': '#7CB342',
        'sabi-green-dark': '#1B7A3D',
        'sabi-green-light': '#8BC34A',
        'work-orange': '#E8630A',
        'work-orange-light': '#FF8534',
        'cash-gold': '#F9A825',
        'alert-red': '#D32F2F',
        'warm-bg': '#FAFAF8',
        'warm-surface': '#FFFFFF',
        'warm-border': '#E8E4DF',
        'warm-text': '#1A1A1A',
        'warm-muted': '#6B6B6B'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
