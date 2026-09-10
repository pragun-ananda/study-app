/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: {
          bg: '#050811',
          slate: '#0f172a',
          dark: '#080c16'
        },
        neon: {
          cyan: '#00f0ff',
          glow: 'rgba(0, 240, 255, 0.15)',
          amber: '#ffaa00',
          critical: '#ff3366',
          emerald: '#00ff9d'
        }
      },
      fontFamily: {
        mono: ['"Plus Jakarta Sans"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Plus Jakarta Sans"', '"Orbitron"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
