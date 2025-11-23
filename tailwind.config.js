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
        // Palette noir/gris foncé sobre
        background: {
          DEFAULT: '#0a0a0a',      // Noir profond
          surface: '#1a1a1a',       // Gris très foncé
          elevated: '#242424',      // Gris foncé élevé
          hover: '#2e2e2e',         // Gris foncé hover
        },
        // Bordures grises sobres
        border: {
          DEFAULT: '#323232',       // Bordure par défaut
          light: '#323232',         // Bordure claire
          lighter: '#323232',       // Bordure encore plus claire
        },
        // Couleurs primaires rouge-orange
        primary: {
          DEFAULT: '#f93705',       // Rouge-orange principal (rgb(249, 55, 5))
          dark: '#d43004',          // Rouge-orange foncé
          light: '#ff4d1a',         // Rouge-orange clair
          hover: '#ff5722',         // Rouge-orange hover
          muted: '#ff6b3d',         // Rouge-orange atténué
        },
        // Textes
        text: {
          primary: '#e5e5e5',       // Texte principal clair
          secondary: '#a0a0a0',     // Texte secondaire gris
          muted: '#707070',         // Texte atténué
          inverse: '#0a0a0a',       // Texte inversé (pour fond clair)
        },
        // Statuts
        status: {
          success: '#10b981',       // Vert succès
          warning: '#f59e0b',       // Orange warning
          danger: '#ef4444',        // Rouge danger
          info: '#3b82f6',          // Bleu info
        },
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '0.9375rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.75rem',
        '3xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(249, 55, 5, 0.1)',
        'primary': '0 4px 20px rgba(249, 55, 5, 0.15)',
        'elevated': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'none': 'none',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
}
