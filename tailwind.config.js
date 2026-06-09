/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/index.html', './frontend/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--white) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
          300: 'rgb(var(--ink-300) / <alpha-value>)',
        },
        paper: {
          50: 'rgb(var(--paper-50) / <alpha-value>)',
          100: 'rgb(var(--paper-100) / <alpha-value>)',
          200: 'rgb(var(--paper-200) / <alpha-value>)',
        },
        slateblue: {
          700: 'rgb(var(--slateblue-700) / <alpha-value>)',
          500: 'rgb(var(--slateblue-500) / <alpha-value>)',
          100: 'rgb(var(--slateblue-100) / <alpha-value>)',
        },
        brass: {
          600: 'rgb(var(--brass-600) / <alpha-value>)',
          100: 'rgb(var(--brass-100) / <alpha-value>)',
        },
        success: {
          surface: 'rgb(var(--success-surface) / <alpha-value>)',
          text: 'rgb(var(--success-text) / <alpha-value>)',
          border: 'rgb(var(--success-border) / <alpha-value>)',
        },
        danger: {
          surface: 'rgb(var(--danger-surface) / <alpha-value>)',
          text: 'rgb(var(--danger-text) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
          border: 'rgb(var(--danger-border) / <alpha-value>)',
        },
      },
      boxShadow: {
        quiet: 'var(--shadow-quiet)',
        hairline: 'var(--shadow-hairline)',
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
