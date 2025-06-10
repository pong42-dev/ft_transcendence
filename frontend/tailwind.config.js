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
          black: '#0D0D0D',
          green: '#3EFF3E',
          darkGreen: '#28A428',
          red: '#FF5F56',
          yellow: '#FFBD2E',
          lightGreen: '#27C93F',
          gray: '#444444',
          blue: '#42A5F5',
          gold: '#FFD700'
        }
      },
      fontFamily: {
        jetbrains: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'typing': 'typing 1.5s steps(40, end)',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-in'
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' }
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      height: {
        'game-sm': '200px',
        'game-md': '300px',
        'terminal-sm': '150px',
        'terminal-md': '200px'
      }
    }
  },
  plugins: [],
}