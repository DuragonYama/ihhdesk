/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ofa brand colors
        'ofa-red': '#B93939',
        'ofa-red-hover': '#a33232',
        'ofa-bg': '#181818',
        'ofa-bg-dark': '#121212',
      },
    },
  },
  plugins: [],
}