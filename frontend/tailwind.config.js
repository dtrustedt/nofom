// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      colors: {
        primary:  'var(--color-primary)',
        accent:   'var(--color-accent)',
        surface:  'var(--color-surface)',
        border:   'var(--color-border)',
        high:     'var(--color-high)',
        medium:   'var(--color-medium)',
        low:      'var(--color-low)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)'
      }
    }
  },
  plugins: []
}
