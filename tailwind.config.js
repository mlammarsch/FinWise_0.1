/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Roboto Mono', 'Segoe UI', 'Inter', 'Roboto', 'sans-serif'],
        'serif': ['Roboto Slab', 'serif'],
        'mono': ['Roboto Mono', 'monospace'],
        'lobster': ['Lobster', 'cursive'],
        'lobster-two': ['Lobster Two', 'cursive']
      }
    }
  },
  plugins: [require('@tailwindcss/vite'), require('daisyui')],
};
