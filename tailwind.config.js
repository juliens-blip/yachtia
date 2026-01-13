/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          navy: {
            50: '#e8eaf6',
            100: '#c3cce8',
            500: '#1a237e',
            600: '#151b5f',
            900: '#0d1142',
          },
          gold: {
            50: '#fffbeb',
            100: '#fef3c7',
            500: '#d4af37',
            600: '#b8941f',
            900: '#7a610c',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
