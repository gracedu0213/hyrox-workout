/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    'bg-foundation', 'bg-aerobic', 'bg-engine', 'bg-power', 'bg-complete',
    'text-foundation', 'text-aerobic', 'text-engine', 'text-power', 'text-complete',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a1a',
        panel: '#242424',
        panel2: '#2e2e2e',
        accent: '#F0E040',
        accent2: '#FFD500',
        muted: '#8a8a8a',
        line: '#3a3a3a',
        foundation: '#F0E040',
        aerobic: '#5BC0EB',
        engine: '#FF6B6B',
        power: '#9B59B6',
        complete: '#2ECC71',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Arial Black"', 'Impact', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
