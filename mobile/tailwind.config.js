/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#06090E",
          dark: "#030508",
          card: "#0F1622",
          border: "rgba(255, 255, 255, 0.07)",
          glass: "rgba(15, 22, 34, 0.78)",
        },
        emerald: {
          volt: "#00F59B",
          glow: "rgba(0, 245, 155, 0.35)",
        },
        amber: {
          solar: "#FFB800",
          glow: "rgba(255, 184, 0, 0.35)",
        },
        cyan: {
          cyber: "#00E5FF",
          glow: "rgba(0, 229, 255, 0.35)",
        },
        crimson: {
          pulse: "#FF3B5C",
          glow: "rgba(255, 59, 92, 0.35)",
        },
      },
      fontFamily: {
        space: ["SpaceGrotesk-Bold", "sans-serif"],
        spaceMedium: ["SpaceGrotesk-SemiBold", "sans-serif"],
        jakarta: ["PlusJakartaSans-Regular", "sans-serif"],
        jakartaMedium: ["PlusJakartaSans-Medium", "sans-serif"],
        jakartaBold: ["PlusJakartaSans-Bold", "sans-serif"],
        mono: ["JetBrainsMono-Bold", "monospace"],
      },
    },
  },
  plugins: [],
};

