/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5CF6', // Roxo similar ao das imagens
          dark: '#7C3AED',
          light: '#A78BFA',
        },
        dark: {
          DEFAULT: '#1E1E2E', // Fundo escuro similar ao das imagens
          light: '#2D2D3F',
          lighter: '#3D3D4F',
        }
      },
    },
  },
  plugins: [],
}
