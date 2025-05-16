import type { Config } from "tailwindcss";
import typographyPlugin from "@tailwindcss/typography";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
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
      typography: (theme: any) => ({
        DEFAULT: {
          css: {
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--primary))",
              textDecorationLine: "none",
              "&:hover": {
                textDecorationLine: "underline",
              },
            },
            "h1, h2, h3, h4, h5, h6": {
              fontFamily: theme("fontFamily.serif").join(","),
              color: "hsl(var(--foreground))",
              fontWeight: "700",
            },
            strong: {
              color: "hsl(var(--foreground))",
              fontWeight: "600",
            },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--border))",
            },
            maxWidth: "75ch",
          },
        },
        dark: {
          css: {
            color: "hsl(var(--foreground))",
            a: { color: "hsl(var(--primary))" },
            "h1, h2, h3, h4, h5, h6": { color: "hsl(var(--foreground))" },
            strong: { color: "hsl(var(--foreground))" },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--border))",
            },
          },
        },
      }),
      // ... your existing theme extensions ...
      // shadcn/ui usually adds its theme variables here or in globals.css
    },
  },
  plugins: [typographyPlugin, animatePlugin],
};
export default config;
