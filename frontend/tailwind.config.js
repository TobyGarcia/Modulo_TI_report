/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          dark: '#1c1917',
          ochre: '#c68a1d',
          'ochre-dark': '#96640e',
          'ochre-light': '#fef3c7',
          yellow: '#f3c023',
          'yellow-medium': '#e6b520',
          'yellow-light': '#fef9c3',
          surface: '#1e1e1e',
        }
      }
    },
  },
  plugins: [],
}
