/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './src/**/*.mdx', './app/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
