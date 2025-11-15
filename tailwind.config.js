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
        // Palette de gris neutres (sans teinte bleue)
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Palette rouge-orange principale
        primary: {
          DEFAULT: 'rgb(249, 55, 5)',
          hover: 'rgb(230, 45, 0)',
        },
        // Backgrounds en gris très foncé
        background: {
          DEFAULT: '#1a1a1a',
          surface: '#242424',
          hover: '#2e2e2e',
        },
        // Textes en vrai gris neutre
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          muted: '#737373',
        },
        // Bordures en vrai gris neutre
        border: {
          DEFAULT: 'rgba(64, 64, 64, 0.3)',
          dark: '#404040',
          subtle: 'rgba(82, 82, 82, 0.3)',
        },
        // Statuts avec rouge-orange pour danger
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          danger: 'rgb(249, 55, 5)',
          info: '#737373',
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
