/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* 🔥 ADD THIS BLOCK */
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        secondary: "var(--color-secondary)",

        dark: {
          900: "#111827",
          800: "#1F2937",
          700: "#374151",
        },

        primary: {
          600: "#2563eb",
        },
      },

      keyframes: {
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        zoomIn: {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        zoomOut: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(0.95)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-4px)" },
          "100%": { transform: "translateY(0)" },
        },
      },

      animation: {
        marquee: "marquee 12s linear infinite",
        "fade-in": "fadeIn 150ms ease-out",
        "fade-out": "fadeOut 150ms ease-in",
        "zoom-in": "zoomIn 150ms ease-out",
        "zoom-out": "zoomOut 150ms ease-in",
        "slide-down": "slideDown 150ms ease-out",
      },
    },
  },
  plugins: [],
}