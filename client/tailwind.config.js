/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f4f8',
          100: '#b8e0ec',
          200: '#8acce0',
          300: '#5cb8d4',
          400: '#2ea4c8',
          500: '#1a5276',
          600: '#154360',
          700: '#10334a',
          800: '#0b2231',
          900: '#051119',
        },
        secondary: {
          50: '#eafaf1',
          100: '#c5f0d8',
          200: '#9fe6bf',
          300: '#7adca6',
          400: '#54d28d',
          500: '#2ecc71',
          600: '#25a35a',
          700: '#1c7a44',
          800: '#13522e',
          900: '#092917',
        }
      }
    },
  },
  plugins: [],
}