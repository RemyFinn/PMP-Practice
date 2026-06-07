/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/index.html', './frontend/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#14110f',
          800: '#2f2a25',
          600: '#625a50',
          400: '#91887b',
        },
        paper: {
          50: '#fbfaf7',
          100: '#f5f1ea',
          200: '#e7e1d8',
        },
        slateblue: {
          700: '#33475f',
          500: '#60758e',
          100: '#e8edf1',
        },
        brass: {
          600: '#8a704d',
          100: '#eee7dc',
        },
      },
      boxShadow: {
        quiet: '0 18px 50px rgba(42, 35, 28, 0.08)',
        hairline: '0 1px 0 rgba(42, 35, 28, 0.08)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        latin: ['var(--font-latin)'],
      },
    },
  },
  plugins: [],
}
