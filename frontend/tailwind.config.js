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
        primary: {
          50: '#fffdf0',
          100: '#fffbc2',
          200: '#fff485',
          300: '#ffea47',
          400: '#ffdb1a',
          500: '#fad201', // Amarillo tráfico
          600: '#d9b600',
          700: '#b39600',
          800: '#8c7600',
          900: '#736100',
        },
        brand: {
          yellow: '#fad201',
          dark: '#1a1a1a',
          navy: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
