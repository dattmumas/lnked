# Lnked Design System Style Guide

**Version**: 1.0  
**Last Updated**: 2025-05-31  
**Technology Stack**: Next.js + TypeScript + Tailwind CSS + Radix UI

## 🎨 Design Philosophy

The Lnked design system prioritizes **clarity**, **accessibility**, and **elegance** for a modern newsletter and content creation platform. Our design principles:

- **User-Centricity**: Every design decision serves the user's content creation and reading experience
- **Progressive Enhancement**: Mobile-first approach with thoughtful desktop enhancements
- **Semantic Consistency**: Visual elements convey meaning and hierarchy clearly
- **Accessibility First**: WCAG 2.1 AA compliance is non-negotiable
- **Performance Minded**: Lightweight, efficient CSS with minimal bundle impact

## 🎨 Color Palette

### Primary Colors (OKLCH Color Space)

**Light Mode**

```css
--primary: oklch(0.58 0.18 262) /* Rich purple-blue */
  --primary-foreground: oklch(0.985 0.01 262) --accent: oklch(0.72 0.25 203)
  /* Bright blue accent */ --accent-foreground: oklch(0.145 0.04 203)
  --background: oklch(0.98 0.015 82) /* Warm off-white */
  --foreground: oklch(0.24 0.02 262) /* Deep text color */;
```

**Dark Mode**

```css
--primary: oklch(0.75 0.16 262) /* Lighter purple-blue */
  --primary-foreground: oklch(0.205 0.05 262) --accent: oklch(0.8 0.18 203)
  /* Bright cyan accent */ --accent-foreground: oklch(0.145 0.05 203)
  --background: oklch(0.18 0.015 262) /* Deep dark background */
  --foreground: oklch(0.92 0.01 82) /* Light text */;
```

### Semantic Colors

**Status Colors**

```css
--destructive: oklch(0.577 0.245 27.325) /* Error/danger */
  --destructive-foreground: oklch(0.985 0.01 27.325) --muted: oklch(0.97 0 0)
  /* Subtle backgrounds */ --muted-foreground: oklch(0.4 0 0)
  /* Secondary text */ --border: oklch(0.88 0 0) /* UI borders */
  --input: oklch(0.922 0 0) /* Form inputs */;
```

### Usage Guidelines

- **Primary**: Main CTAs, active states, brand elements
- **Accent**: Links, highlights, interactive elements
- **Destructive**: Error states, delete actions, warnings
- **Muted**: Secondary content, subtle backgrounds
- **Border**: Separators, outlines, container boundaries

## 📝 Typography

### Font Families

**Headings: Source Serif 4**

```css
font-family: var(--font-playfair); /* Source Serif 4 */
```

- Elegant serif for headlines and content headings
- Weights: 300, 400, 500, 600, 700
- Use for: h1-h6, article titles, emphasis

**Body Text: Inter (System Fallback)**

```css
font-family: var(--font-inter); /* Inter, system-ui fallback */
```

- Clean sans-serif for maximum readability
- Use for: body text, UI labels, navigation

### Typography Scale

**Heading Hierarchy**

```css
h1: text-3xl (30px) font-semibold tracking-tight
h2: text-2xl (24px) font-semibold tracking-tight
h3: text-xl (20px) font-semibold tracking-tight
h4: text-lg (18px) font-semibold tracking-tight
h5: text-base (16px) font-semibold tracking-tight
h6: text-sm (14px) font-semibold tracking-tight
```

**Body Text Sizes**

```css
text-base: 16px   /* Default body text */
text-sm: 14px     /* Secondary text, captions */
text-xs: 12px     /* Meta information, badges */
text-lg: 18px     /* Emphasized body text */
```

### Typography Guidelines

- **Line Height**: Use `leading-relaxed` (1.625) for body text
- **Letter Spacing**: Use `tracking-tight` for headings
- **Text Color**: Always use semantic color tokens for consistency
- **Contrast**: Ensure minimum 4.5:1 contrast ratio for accessibility

## 📏 Spacing System

### Base Scale (8px Grid)

```css
--spacing-xs: 0.5rem /* 8px */ --spacing-sm: 1rem /* 16px */
  --spacing-md: 1.5rem /* 24px */ --spacing-lg: 2rem /* 32px */
  --spacing-xl: 3rem /* 48px */;
```

### Tailwind Spacing Classes

**Common Patterns**

```css
gap-2: 8px          /* Component internal spacing */
gap-4: 16px         /* Card/section spacing */
gap-6: 24px         /* Layout spacing */
gap-8: 32px         /* Major section separation */

p-4: 16px           /* Standard padding */
px-6: 24px          /* Horizontal container padding */
py-8: 32px          /* Vertical section padding */
```

### Layout Guidelines

- **Mobile**: 16px (px-4) horizontal margins
- **Desktop**: 32px (px-8) horizontal margins
- **Component Spacing**: Use consistent 16px (gap-4) between related elements
- **Section Spacing**: Use 32px-48px (gap-8 to gap-12) between major sections

## 🔘 Component Design System

### Button Variants

**Primary Button (Default)**

```tsx
<Button variant="default" size="default">
  Primary Action
</Button>
```

- Background: `bg-accent`
- Text: `text-accent-foreground`
- Hover: `hover:bg-accent/90`
- Active: `active:scale-[0.98]`

**Secondary Button**

```tsx
<Button variant="secondary" size="default">
  Secondary Action
</Button>
```

- Background: `bg-secondary`
- Text: `text-secondary-foreground`
- Hover: `hover:bg-secondary/80`

**Ghost Button**

```tsx
<Button variant="ghost" size="default">
  Subtle Action
</Button>
```

- Background: Transparent
- Hover: `hover:bg-muted`
- Use for: Less prominent actions, navigation

**Outline Button**

```tsx
<Button variant="outline" size="default">
  Alternative Action
</Button>
```

- Border: `border-border`
- Background: `bg-background`
- Hover: `hover:bg-muted`

### Button Sizes

```tsx
size = 'sm'; // h-8 px-3 text-xs (Compact)
size = 'default'; // h-10 px-4 py-2 (Standard)
size = 'lg'; // h-12 px-6 text-base (Prominent)
size = 'icon'; // h-10 w-10 (Square icon button)
```

### Card Component System

**Basic Card**

```tsx
<div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
  Card Content
</div>
```

**Interactive Card**

```tsx
<div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 hover:bg-muted/30 transition-colors cursor-pointer">
  Clickable Card
</div>
```

**Card Variants**

- **Metrics Card**: Add `p-4` with centered content for dashboard metrics
- **Content Card**: Add `p-6` with comfortable reading space
- **Compact Card**: Add `p-3` for dense information display

## 🎯 Interactive States

### Hover Effects

**Standard Hover Pattern**

```css
transition-colors duration-200 hover:bg-muted/50
```

**Button Hover with Scale**

```css
transition-all duration-200 hover:scale-105 active:scale-95
```

**Navigation Hover**

```css
transition-all duration-150 hover:bg-accent/50
```

### Focus States

**Focus Ring (Accessibility)**

```css
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

**Interactive Element Focus**

```css
focus:ring-2 focus:ring-accent/60 focus:border-accent/60
```

### Active States

**Navigation Active**

```css
bg-accent text-accent-foreground
```

**Button Active**

```css
active: scale-[0.98]; // Subtle press feedback
```

## 📱 Responsive Design Strategy

### Breakpoint System

```css
sm: 640px   /* Small tablets */
md: 768px   /* Large tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

### Mobile-First Patterns

**Navigation**

- Mobile: Hamburger menu with sheet overlay
- Desktop: Horizontal navigation with dropdowns

**Content Layout**

- Mobile: Single column, full-width cards
- Tablet: Two-column grid where appropriate
- Desktop: Multi-column with sidebar options

**Typography**

- Mobile: Slightly smaller headings, comfortable line-height
- Desktop: Larger headings, increased spacing

### Component Responsive Behavior

**Cards**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  // Responsive card grid
</div>
```

**Spacing**

```tsx
<div className="px-4 md:px-6 lg:px-8">// Progressive horizontal spacing</div>
```

## ♿ Accessibility Guidelines

### Color Contrast

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Ensure clear visual distinction

### Focus Management

- **Keyboard Navigation**: All interactive elements must be focusable
- **Focus Indicators**: Visible focus rings on all interactive elements
- **Skip Links**: Provide navigation shortcuts for screen readers

### Semantic HTML

- **Headings**: Proper h1-h6 hierarchy
- **Landmarks**: Use semantic HTML5 elements (nav, main, aside, etc.)
- **ARIA Labels**: Descriptive labels for complex interactions

### Screen Reader Support

```tsx
<Button aria-label="Edit post settings">
  <Settings className="h-4 w-4" />
</Button>
```

## 🎨 Animation System

### Transition Durations

```css
duration-150  /* Fast UI feedback (150ms) */
duration-200  /* Standard transitions (200ms) */
duration-300  /* Deliberate animations (300ms) */
```

### Common Animation Patterns

**Micro-interactions**

```css
transition-all duration-200 transform hover:scale-105 active:scale-95
```

**Page Transitions**

```css
transition-opacity duration-300 ease-in-out
```

**Loading States**

```css
animate-pulse  /* Skeleton loading */
animate-spin   /* Loading spinners */
```

### Animation Guidelines

- **Performance**: Use `transform` and `opacity` for hardware acceleration
- **Accessibility**: Respect `prefers-reduced-motion` user preference
- **Purpose**: Every animation should serve a functional purpose

## 🌙 Dark Mode Implementation

### Theme Switching

The design system supports automatic dark mode via CSS custom properties:

```tsx
<html className="dark"> // Toggles entire theme
```

### Dark Mode Considerations

- **Contrast**: Ensure sufficient contrast in both themes
- **Branding**: Maintain brand identity across themes
- **Images**: Consider dark mode variants for illustrations
- **Testing**: Test all components in both light and dark modes

## 📐 Layout Patterns

### Container Patterns

**Page Container**

```tsx
<div className="container max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
  // Full-width responsive container
</div>
```

**Content Container**

```tsx
<div className="max-w-4xl mx-auto px-4">// Reading-optimized content width</div>
```

### Grid Systems

**Dashboard Grid**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  // Responsive dashboard layout
</div>
```

**Content Grid**

```tsx
<div className="grid grid-cols-12 gap-6">
  <main className="col-span-12 lg:col-span-8">Main Content</main>
  <aside className="col-span-12 lg:col-span-4">Sidebar</aside>
</div>
```

## 🔧 Implementation Guidelines

### CSS Custom Properties Usage

Always use semantic tokens rather than hardcoded values:

```css
/* ✅ Good */
color: hsl(var(--foreground));
background: hsl(var(--background));

/* ❌ Avoid */
color: #1a1a1a;
background: #ffffff;
```

### Tailwind Class Naming

Follow consistent patterns for maintainability:

```tsx
// Structure: layout -> spacing -> colors -> typography -> effects
className =
  'flex items-center gap-4 bg-card p-6 text-foreground rounded-lg shadow-sm hover:shadow-md transition-shadow';
```

### Component Composition

Build complex components from base patterns:

```tsx
// Base button + custom enhancements
<Button
  variant="default"
  size="lg"
  className="gap-2 font-semibold shadow-lg hover:shadow-xl"
>
  <Icon className="h-5 w-5" />
  Enhanced Button
</Button>
```

## ✅ Style Guide Checklist

When implementing new UI components, verify:

- [ ] **Colors**: Uses semantic color tokens from the design system
- [ ] **Typography**: Follows established font hierarchy and sizing
- [ ] **Spacing**: Uses 8px grid system spacing values
- [ ] **Interactive States**: Includes hover, focus, and active states
- [ ] **Accessibility**: Meets WCAG 2.1 AA standards
- [ ] **Responsive**: Works across all breakpoints
- [ ] **Dark Mode**: Functions properly in both light and dark themes
- [ ] **Performance**: Uses efficient CSS patterns
- [ ] **Consistency**: Aligns with existing component patterns

---

**Note**: This style guide is a living document that should be updated as the design system evolves. All design decisions should reference and extend these established patterns for maximum consistency and maintainability.
