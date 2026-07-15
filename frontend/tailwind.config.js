/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      colors: {
        brand: {
          violet: "#a78bfa",
          "violet-dark": "#7c3aed",
          emerald: "#34d399",
          rose: "#f43f5e",
          amber: "#fbbf24",
          sky: "#38bdf8",
        },
        surface: {
          deep:  "#07071a",
          base:  "#0d0d26",
          card:  "#12122e",
        },
      },
      backdropBlur: {
        xs: "4px",
      },
      animation: {
        "fade-up":    "fadeUp 0.4s ease both",
        "fade-in":    "fadeIn 0.3s ease both",
        "float":      "float 4s ease-in-out infinite",
        "pulse-ring": "pulseRing 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        pulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(167,139,250,0.4)" },
          "70%":  { boxShadow: "0 0 0 10px rgba(167,139,250,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(167,139,250,0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition:  "200% center" },
        },
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-top":    "env(safe-area-inset-top, 0px)",
      },
    },
  },
  plugins: [],
};
