// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Nofom brand palette
        primary: '#0f6cbf',
        danger: '#dc2626',
        warning: '#d97706',
        success: '#16a34a',
      }
    }
  },
  plugins: []
}
