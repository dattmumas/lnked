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
        brandPrimary: {
          DEFAULT: "#E50914", // YouTube Red
          dark: "#B0060F",
        },
        brandSecondary: {
          DEFAULT: "#1F1F1F", // Deep Charcoal
          dark: "#121212",
        },
        brandPaperBg: {
          DEFAULT: "#F7F7F7", // Newspaper Light Gray
          dark: "#232323",
        },
        brandHighlight: {
          DEFAULT: "#FFCA28", // Gold Accent
          dark: "#FFD54F",
        },
        // Utility for highlight backgrounds/text
        highlight: {
          DEFAULT: "#FFCA28",
          fg: "#1F1F1F",
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
      typography: {
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
            h1: {
              fontSize: "3rem",
              fontWeight: "800",
              lineHeight: "1.1",
              color: "hsl(var(--foreground))",
            },
            h2: {
              fontSize: "2.25rem",
              fontWeight: "700",
              lineHeight: "1.15",
              color: "hsl(var(--foreground))",
            },
            h3: {
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "hsl(var(--foreground))",
            },
            h4: {
              fontWeight: "600",
              color: "hsl(var(--foreground))",
            },
            strong: {
              color: "hsl(var(--foreground))",
              fontWeight: "600",
            },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--border))",
            },
            // Other elements like code blocks, etc., can be customized here too.
            // Example for code:
            // code: { color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--muted))", padding: '0.2em 0.4em', borderRadius: '0.25rem' },
            // 'code::before': { content: 'none' }, // Remove backticks from inline code
            // 'code::after': { content: 'none' },
            // pre: { backgroundColor: "hsl(var(--muted))" },
          },
        },
      },
      // ... your existing theme extensions ...
      // shadcn/ui usually adds its theme variables here or in globals.css
    },
  },
  plugins: [typographyPlugin, animatePlugin],
};
export default config;
