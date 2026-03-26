/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f6efe5",
        ink: "#1f2937",
        moss: "#456b57",
        clay: "#c97b4f",
        mist: "#e6efe8",
        oat: "#f8f5ef"
      },
      boxShadow: {
        soft: "0 20px 50px rgba(31, 41, 55, 0.08)"
      },
      fontFamily: {
        sans: ["'Avenir Next'", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
