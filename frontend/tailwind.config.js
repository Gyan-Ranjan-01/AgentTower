/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        surface: "#0f172a",
        "surface-card": "#131d35",
        "surface-border": "#1e293b",
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        critical: {
          DEFAULT: "#ef4444",
          bg: "#450a0a",
          border: "#991b1b",
          text: "#fca5a5",
        },
        medium: {
          DEFAULT: "#f59e0b",
          bg: "#451a03",
          border: "#92400e",
          text: "#fcd34d",
        },
        low: {
          DEFAULT: "#64748b",
          bg: "#0f172a",
          border: "#334155",
          text: "#cbd5e1",
        },
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

