/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lville: {
          red: "#A6192E",
          dark: "#1a1a1a",
          cream: "#F5F1E8",
        },
      },
    },
  },
  plugins: [],
};
