/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#eef2f8",
          card: "#ffffff",
          subtle: "#f8fafc",
          border: "#dbe3ee",
          muted: "#64748b",
          dark: "#1e293b",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
      },
      boxShadow: {
        'clay-card': '8px 8px 18px #d1d9e6, -8px -8px 18px #ffffff',
        'clay-card-sm': '4px 4px 10px #d1d9e6, -4px -4px 10px #ffffff',
        'clay-card-lg': '12px 12px 24px #cbd5e1, -12px -12px 24px #ffffff',
        'clay-btn': '4px 4px 10px #d1d9e6, -4px -4px 10px #ffffff, inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.06)',
        'clay-btn-active': 'inset 3px 3px 6px #cbd5e1, inset -3px -3px 6px #ffffff',
        'clay-inset': 'inset 3px 3px 6px #d1d9e6, inset -3px -3px 6px #ffffff',
        'clay-pill': '3px 3px 6px #d1d9e6, -3px -3px 6px #ffffff',
      },
      borderRadius: {
        'clay': '1.25rem',
        'clay-lg': '1.75rem',
        'clay-sm': '0.85rem',
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
