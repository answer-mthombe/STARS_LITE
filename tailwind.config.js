/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette (fixed tokens)
        bg: {
          DEFAULT: "#E8E8E8",
        },
        brand: {
          // Borders / Titles / Inputs / Accent UI
          accent: "#006281",
          // Buttons / Important Links / Primary Actions
          primary: "#4F1A1D",
        },
        ink: {
          // Dark text for light backgrounds
          DEFAULT: "#0B0F14",
          muted: "#27313A",
          subtle: "#4A5560",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#E8E8E8",
        },
      },
      borderRadius: {
        // premium rounded system
        xl: 16,
        "2xl": 20,
        pill: 9999,
      },
      boxShadow: {
        // subtle luxury shadows; use sparingly
        soft: "0px 8px 24px rgba(11,15,20,0.08)",
        hairline: "0px 1px 2px rgba(11,15,20,0.10)",
      },
    },
  },
  plugins: [],
};

