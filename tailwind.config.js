/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}", // ✅ include all component templates and code
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8E9D2",
        // Kept in sync with $primary-color in styles.scss — single source of truth.
        primary: "#2563eb",
        peachlight: "#FEF8EC",
        peach: "#FBEFDF",
        // "header-bg": "#f5e9d5",
        "header-bg": "#FFFFFF",
      },
      backgroundImage: {
        "peach-fade":
          "linear-gradient(0deg, rgba(249, 239, 220, 0) 0%, rgba(248, 233, 210, 1) 100%)",
      },
      fontFamily: {
        josefin: ['"Josefin Sans"', "sans-serif"],
        jost: ['"Jost"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
