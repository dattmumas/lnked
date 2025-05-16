import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography"; // Import the plugin

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        "almost-black": "#101010",
        "true-black": "#0A0A0A",
      },
      keyframes: {
        // customFadeInLetter: { // Removed
        //   "0%": { opacity: "0" },
        //   "100%": { opacity: "1" },
        // },
        // customFadeInUp: { // Removed
        //   "0%": { opacity: "0", transform: "translateY(20px)" },
        //   "100%": { opacity: "1", transform: "translateY(0)" },
        // },
      },
      animation: {
        // customFadeInLetter: "customFadeInLetter 0.5s forwards", // Removed
        // customFadeInUp: "customFadeInUp 0.6s forwards", // Removed
      },
      // ... your existing theme extensions ...
      // shadcn/ui usually adds its theme variables here or in globals.css
    },
  },
  plugins: [
    typography, // Add the typography plugin
    // require('tailwindcss-animate'), // shadcn/ui usually adds this, ensure it is present if needed
  ],
};
export default config;
