/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': 'rgb(2 10 245 / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
