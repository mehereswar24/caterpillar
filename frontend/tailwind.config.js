/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cat: {
          yellow: '#FFB81C',
          black: '#000000',
          dark: '#222222',
          gray: '#E0E0E0'
        }
      }
    },
  },
  plugins: [],
}
