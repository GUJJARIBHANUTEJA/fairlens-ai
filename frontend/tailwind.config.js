/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#010102',
          card: '#0f1011',
          hover: '#141516',
          border: '#23252a',
          muted: '#8a8f98',
          text: '#f7f8f8',
        },
        light: {
          bg: '#fafafa',
          card: '#ffffff',
          hover: '#f4f4f5',
          border: '#e4e4e7',
          muted: '#71717a',
          text: '#18181b',
        },
        accent: {
          DEFAULT: '#5e6ad2',
          hover: '#6f7ce0',
          muted: 'rgba(94, 106, 210, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
