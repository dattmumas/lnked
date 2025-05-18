# Lnked Design System

## Overview

This document tracks all design tokens, theming, and styling decisions for the Lnked app. It is a living reference for developers and designers to ensure consistency, accessibility, and maintainability across the codebase.

---

## 1. Color Tokens

All colors are defined as CSS variables in `globals.css` and mapped in `tailwind.config.ts` using `hsl(var(--token))` for full themeability and dark mode support.

### Core Tokens

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`
- `--muted`, `--muted-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, etc.
- Brand tokens: `brandPrimary`, `brandSecondary`, `brandPaperBg`, `brandHighlight`, `highlight`

### Light/Dark Mode

- Light mode: tokens defined under `:root` in `globals.css`
- Dark mode: tokens overridden under `.dark` in `globals.css`
- All Tailwind color utilities reference these tokens for seamless theming.

---

## 2. Spacing & Sizing

- **Base grid:** 4px (Tailwind default)
- **Common spacing:** Use Tailwind utilities like `p-4`, `my-8`, `space-y-4` (multiples of 4px)
- **No arbitrary pixel values**; always use the scale for padding, margin, and gap.

---

## 3. Border Radius

- **Primary radius:** `--radius` (default: 0.375rem/6px)
- **Tailwind mapping:**
  - `rounded-lg`: `var(--radius)`
  - `rounded-md`: `calc(var(--radius) - 2px)`
  - `rounded-sm`: `calc(var(--radius) - 4px)`
  - `rounded-xl`: `calc(var(--radius) + 4px)`
- **All components use these tokens for consistent rounding.**

---

## 4. Typography

- **Font family:** Geist Sans (body), Geist Mono (mono), with system fallbacks
- **Headings:** Use semantic HTML (`<h1>`, `<h2>`, etc.) and Tailwind text classes
- **Typography plugin:** Tailwind's `@tailwindcss/typography` is customized to use tokens for all colors and font weights
- **Rich content:** Use `.prose` for posts/newsletters
- **No custom font sizes/weights outside the theme**

---

## 5. General Guidelines

- **No global Tailwind utility application to `*` or high-level elements with design tokens**
- **All resets and base styles use plain CSS or Tailwind preflight**
- **Dark mode:** Always via `.dark` class (managed by next-themes)
- **Icons:** Use Lucide icons, sized with `.size-4` or `w-4 h-4`, and accessible
- **Accessibility:** All interactive elements have visible focus states and proper ARIA labels
- **No hardcoded colors, spacing, or border radius in components**
- **No Shadcn UI or other third-party UI kits**

---

## 6. Component Patterns

- **UI primitives** (Button, Card, Input, Badge, etc.) live in `src/components/ui/` and use only Tailwind classes referencing tokens
- **Variants** (primary, secondary, outline, etc.) are handled via CVA and tokens
- **Minimalist, Linear-inspired look:** Flat, sharp, high-contrast, with whitespace and subtle dividers

---

## 7. Change Log

- **2024-06-09:**
  - Updated Tailwind typography plugin to use `hsl(var(--foreground))` for all heading colors (removes hardcoded hex values, enables full themeability)
  - Confirmed all color tokens are defined in both `globals.css` and `tailwind.config.ts`
  - Refactored all custom editor and toolbar classes in `globals.css` to use design tokens (e.g., `var(--background)`, `hsl(var(--muted-foreground))`, `hsl(var(--border))`) instead of hardcoded colors for full theme consistency and dark mode support.
  - Audited and refined Button component: all variants, sizes, and focus states now use only Tailwind classes referencing design tokens. No hardcoded or legacy values remain. Focus-visible and disabled states are accessible and themeable.
  - Audited and refined Badge component: all variants now use only Tailwind classes referencing design tokens. No hardcoded or legacy values remain. Focus-visible and disabled states are accessible and themeable.
  - Audited Card component: all subcomponents use only Tailwind classes referencing design tokens for border, background, and text. No hardcoded or legacy values remain.
  - Audited Alert component: all variants now use only Tailwind classes referencing design tokens for border, background, and text. No hardcoded or legacy values remain.
  - Audited Input component: all states now use only Tailwind classes referencing design tokens for border, background, text, and focus. No hardcoded or legacy values remain.
  - Audited Textarea component: all states now use only Tailwind classes referencing design tokens for border, background, text, and focus. No hardcoded or legacy values remain.
  - Audited Select component: all states and variants now use only Tailwind classes referencing design tokens for border, background, text, and focus. No hardcoded or legacy values remain.
  - Audited Sheet component: overlay, content, and close button now use only Tailwind classes referencing design tokens for border, background, and text. No hardcoded or legacy values remain.
  - Audited Root and Dashboard layouts: all use only Tailwind classes referencing design tokens for background, text, border, and spacing. All spacing is on the 4/8px scale. No hardcoded or legacy values remain.
  - Removed all Shadcn UI code, configs, and references from the project as part of the cleanup phase. The codebase is now fully custom and design-system driven.

---

_This document will be updated as further styling decisions are made during the overhaul._
