/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',    // Small phones
      'sm': '640px',    // Large phones/Small tablets
      'md': '768px',    // Tablets
      'lg': '1024px',   // Laptops/Small desktops
      'xl': '1280px',   // Large desktops
      '2xl': '1536px',  // Extra large screens
    },
  },
  plugins: [],
}
