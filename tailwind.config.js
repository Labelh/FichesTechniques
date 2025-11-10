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
        // GestionDesStocks color palette
        primary: {
          DEFAULT: 'rgb(249, 55, 5)',
          hover: 'rgb(230, 45, 0)',
        },
        background: {
          DEFAULT: '#1f1f1f',
          surface: '#2a2a2a',
          hover: '#303030',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#808080',
          muted: '#6b7280',
        },
        border: {
          DEFAULT: 'rgba(148, 163, 184, 0.1)',
          dark: '#3a3a3a',
          subtle: 'rgba(75, 85, 99, 0.3)',
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: 'rgb(249, 55, 5)',
          info: '#3b82f6',
        },
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      fontFamily: {
        sans: ['Nunito Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '0.9375rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'glow': '0 0 0 3px rgba(249, 55, 5, 0.1)',
        'lift': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
}
