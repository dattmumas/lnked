import type { Config } from "tailwindcss";
import typographyPlugin from "@tailwindcss/typography";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'var(--font-source-serif)',
  				'ui-serif',
  				'Georgia',
  				'serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'monospace'
  			]
  		},
  		spacing: {
  			xs: 'var(--spacing-xs)',
  			sm: 'var(--spacing-sm)',
  			md: 'var(--spacing-md)',
  			lg: 'var(--spacing-lg)',
  			xl: 'var(--spacing-xl)'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)'
  		},
  		typography: '(theme: (path: string) => string) => ({\n        DEFAULT: {\n          css: {\n            color: "hsl(var(--foreground))",\n            a: {\n              color: "hsl(var(--accent))",\n              "&:hover": {\n                color: "hsl(var(--accent) / 0.8)",\n              },\n            },\n            p: {\n              fontFamily: theme("fontFamily.serif"),\n              fontSize: "1.125rem",\n              lineHeight: "1.6",\n              marginTop: "1.25em",\n              marginBottom: "1.25em",\n            },\n            h1: {\n              color: "hsl(var(--foreground))",\n              fontFamily: theme("fontFamily.serif"),\n              marginTop: "1.5em",\n              marginBottom: "0.5em",\n            },\n            h2: {\n              color: "hsl(var(--foreground))",\n              fontFamily: theme("fontFamily.serif"),\n              marginTop: "1.25em",\n              marginBottom: "0.5em",\n            },\n            h3: {\n              color: "hsl(var(--foreground))",\n              fontFamily: theme("fontFamily.serif"),\n              marginTop: "1em",\n              marginBottom: "0.5em",\n            },\n            blockquote: {\n              color: "hsl(var(--muted-foreground))",\n              borderLeftColor: "hsl(var(--accent))",\n              fontStyle: "italic",\n            },\n            code: {\n              color: "hsl(var(--foreground))",\n              backgroundColor: "hsl(var(--muted))",\n            },\n          },\n        },\n        dark: {\n          css: {\n            p: {\n              fontFamily: theme("fontFamily.serif"),\n              fontSize: "1.125rem",\n              lineHeight: "1.6",\n              marginTop: "1.25em",\n              marginBottom: "1.25em",\n            },\n            color: "hsl(var(--foreground))",\n            a: {\n              color: "hsl(var(--accent))",\n              "&:hover": {\n                color: "hsl(var(--accent) / 0.8)",\n              },\n            },\n            blockquote: {\n              color: "hsl(var(--muted-foreground))",\n              borderLeftColor: "hsl(var(--accent))",\n              fontStyle: "italic",\n            },\n            code: {\n              color: "hsl(var(--foreground))",\n              backgroundColor: "hsl(var(--muted))",\n            },\n          },\n        },\n        "2xl": {\n          css: {\n            p: { fontSize: "1.25rem", lineHeight: "1.7" },\n            h1: { fontSize: "2.5rem" },\n            h2: { fontSize: "2rem" },\n            h3: { fontSize: "1.75rem" },\n          },\n        },\n      })'
  	},
  	size: {
  		'4': '1rem',
  		'8': '2rem',
  		'12': '3rem',
  		'16': '4rem'
  	}
  },
  plugins: [typographyPlugin, animatePlugin, require("tailwindcss-animate")],
};
export default config;
