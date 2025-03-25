// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './index.html',
      './src/**/*.{vue,js,ts,jsx,tsx}',
    ],
  
    safelist: [
      {
        pattern: /bg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(400|500|600|700|800|900)/,
      },
    ],
  
    theme: {
      extend: {},
    },
  
    plugins: [require('daisyui')],
  }
  