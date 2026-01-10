/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // ✅ include all component templates and code
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8E9D2",
        primary: "#2A445F",
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
