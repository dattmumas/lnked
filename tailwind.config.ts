import type { Config } from "tailwindcss";
import typographyPlugin from "@tailwindcss/typography";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
      },
      colors: {
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
      typography: (theme: (path: string) => string) => ({
        DEFAULT: {
          css: {
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--accent))",
              "&:hover": {
                color: "hsl(var(--accent) / 0.8)",
              },
            },
            p: {
              fontFamily: theme("fontFamily.serif"),
              fontSize: "1.125rem",
              lineHeight: "1.6",
              marginTop: "1.25em",
              marginBottom: "1.25em",
            },
            h1: {
              color: "hsl(var(--foreground))",
              fontFamily: theme("fontFamily.serif"),
              marginTop: "1.5em",
              marginBottom: "0.5em",
            },
            h2: {
              color: "hsl(var(--foreground))",
              fontFamily: theme("fontFamily.serif"),
              marginTop: "1.25em",
              marginBottom: "0.5em",
            },
            h3: {
              color: "hsl(var(--foreground))",
              fontFamily: theme("fontFamily.serif"),
              marginTop: "1em",
              marginBottom: "0.5em",
            },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--accent))",
              fontStyle: "italic",
            },
            code: {
              color: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--muted))",
            },
          },
        },
        dark: {
          css: {
            p: {
              fontFamily: theme("fontFamily.serif"),
              fontSize: "1.125rem",
              lineHeight: "1.6",
              marginTop: "1.25em",
              marginBottom: "1.25em",
            },
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--accent))",
              "&:hover": {
                color: "hsl(var(--accent) / 0.8)",
              },
            },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--accent))",
              fontStyle: "italic",
            },
            code: {
              color: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--muted))",
            },
          },
        },
        "2xl": {
          css: {
            p: { fontSize: "1.25rem", lineHeight: "1.7" },
            h1: { fontSize: "2.5rem" },
            h2: { fontSize: "2rem" },
            h3: { fontSize: "1.75rem" },
          },
        },
      }),
    },
    // Define a custom size utility for consistent icon sizing
    size: {
      "4": "1rem",
      "8": "2rem",
      "12": "3rem",
      "16": "4rem",
    },
  },
  plugins: [typographyPlugin, animatePlugin],
};
export default config;
