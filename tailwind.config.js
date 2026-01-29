/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          green: '#7aca5e',
          'green-dark': '#5ea848',
          'green-darker': '#4a8739',
          cyan: '#6ba89d',
        },
        dark: {
          900: '#0a0a0a',
          800: '#111111',
          700: '#151515',
          600: '#1a1a1a',
          500: '#222222',
          400: '#333333',
        }
      },
      fontFamily: {
        mono: ['"Inconsolata"', 'ui-monospace', 'monospace'],
        sans: ['"Zalando Sans"', 'system-ui', 'sans-serif'],
        display: ['"Zalando Sans SemiExpanded"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'scan': 'scan 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'flicker': 'flicker 0.15s infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        glow: {
          'from': {
            'text-shadow': '0 0 10px #7aca5e, 0 0 20px #7aca5e, 0 0 30px #7aca5e',
            'box-shadow': '0 0 10px #7aca5e, 0 0 20px #7aca5e',
          },
          'to': {
            'text-shadow': '0 0 20px #7aca5e, 0 0 30px #7aca5e, 0 0 40px #7aca5e',
            'box-shadow': '0 0 20px #7aca5e, 0 0 30px #7aca5e',
          },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
