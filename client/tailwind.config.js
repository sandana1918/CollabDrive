/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(31, 41, 55, 0.08)",
        card: "0 18px 40px rgba(31, 41, 55, 0.10)",
        shell: "0 24px 60px rgba(31, 41, 55, 0.08)"
      },
      colors: {
        ink: "#1f1f1f",
        drive: {
          blue: "#1a73e8",
          blueSoft: "#e8f0fe",
          bg: "#f6f8fc",
          line: "#dde3ee",
          text: "#1f1f1f",
          subtext: "#5f6368",
          panel: "#ffffff",
          select: "#c2e7ff"
        }
      }
    }
  },
  plugins: []
};
