/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-amber-50/50', 'border-amber-200', 'bg-amber-100/70', 'text-amber-900', 'text-amber-800', 'bg-amber-50',
    'bg-blue-50/50', 'border-blue-200', 'bg-blue-100/70', 'text-blue-900', 'text-blue-800', 'bg-blue-50',
    'bg-indigo-50/50', 'border-indigo-200', 'bg-indigo-100/70', 'text-indigo-900', 'text-indigo-800', 'bg-indigo-50',
    'bg-emerald-50/50', 'border-emerald-200', 'bg-emerald-100/70', 'text-emerald-900', 'text-emerald-800', 'bg-emerald-50'
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
