/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(76, 29, 65, 0.10)",
        card: "0 18px 40px rgba(76, 29, 65, 0.12)",
        shell: "0 24px 60px rgba(76, 29, 65, 0.12)"
      },
      colors: {
        ink: "#23151f",
        drive: {
          blue: "#9d174d",
          blueSoft: "#f5d0de",
          bg: "#f7f3f6",
          line: "#e7d9e1",
          text: "#23151f",
          subtext: "#6f6471",
          panel: "#ffffff",
          select: "#e9b8c9"
        }
      }
    }
  },
  plugins: []
};
