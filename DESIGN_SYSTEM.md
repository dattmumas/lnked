Proceed# Lnked Design System

This document outlines the design principles, components, and guidelines for the Lnked application. Our design system emphasizes minimalist aesthetics, accessibility, and consistent spacing.

## Core Principles

- **Minimalist Aesthetic**: Clean layouts with ample whitespace
- **Responsive Design**: All components work across mobile, tablet, and desktop
- **Accessibility**: WCAG AA compliance, proper contrast, semantic markup, ARIA attributes
- **Dark Mode Support**: All components work seamlessly in both light and dark modes
- **Consistent 8px Grid**: All spacing is based on multiples of 8px (0.5rem)

## Atomic Design

Our components follow the Atomic Design methodology:

- **Atoms**: Basic building blocks (buttons, inputs, labels)
- **Molecules**: Groups of atoms working together (cards, form fields)
- **Organisms**: Complex components (navigation bars, content sections)
- **Templates**: Page-level layouts without content
- **Pages**: Complete interfaces with real content

## Typography

### Font Families

- **Inter**: Primary sans-serif font for UI elements and body text
- **Source Serif 4**: Serif font used for headings and long-form content

### Text Sizes

| Class     | Size (rem) | Use Case                     |
| --------- | ---------- | ---------------------------- |
| text-xs   | 0.75rem    | Small helper text, captions  |
| text-sm   | 0.875rem   | Form labels, secondary info  |
| text-base | 1rem       | Default body text            |
| text-lg   | 1.125rem   | Emphasized text, card titles |
| text-xl   | 1.25rem    | Section headings             |
| text-2xl  | 1.5rem     | Page titles                  |
| text-3xl  | 1.875rem   | Major headings               |
| text-4xl  | 2.25rem    | Hero text                    |

## Color System

Our colors use CSS variables (custom properties) and are accessed through Tailwind's utility classes.

### Primary Colors

- **Primary**: Main brand color used for CTA buttons, links, and emphasis
- **Secondary**: Used for secondary actions and backgrounds
- **Accent**: For highlights, active states, and special elements

### Semantic Colors

- **Destructive**: For error states, warnings, and delete actions
- **Muted**: For de-emphasized UI elements, backgrounds, and disabled states

### Neutral Colors

- **Background**: Page background
- **Foreground**: Primary text color
- **Card**: Card and raised element background
- **Card Foreground**: Text on cards
- **Border**: Border color for dividers, outlines
- **Input**: Form input background
- **Ring**: Focus rings and outlines

All colors automatically adapt for dark mode via CSS variable switching.

## Spacing

We use a consistent 8px grid for spacing. Use Tailwind's spacing utilities:

| Class | Size (rem) | Size (px) | Use Case                               |
| ----- | ---------- | --------- | -------------------------------------- |
| p-1   | 0.25rem    | 4px       | Very tight spacing within elements     |
| p-2   | 0.5rem     | 8px       | Standard padding for small elements    |
| p-4   | 1rem       | 16px      | Standard content padding               |
| p-6   | 1.5rem     | 24px      | Generous content padding               |
| p-8   | 2rem       | 32px      | Section padding                        |
| p-10  | 2.5rem     | 40px      | Large section padding                  |
| gap-2 | 0.5rem     | 8px       | Grid/flex item separation              |
| gap-4 | 1rem       | 16px      | Standard component separation          |
| gap-6 | 1.5rem     | 24px      | Enhanced separation between components |
| gap-8 | 2rem       | 32px      | Major separation between sections      |

## Borders & Shadows

- **Rounded Corners**: Use rounded-md (var(--radius)) for consistent rounding
- **Borders**: Use border-border for subtle borders (1px)
- **Shadows**: Minimal use of shadows with shadow-sm for subtle depth

## Components

### Buttons

Buttons use the `<Button>` component with variants:

- **default**: Primary actions
- **secondary**: Secondary actions
- **outline**: Tertiary actions
- **ghost**: Low-emphasis actions
- **destructive**: Dangerous actions

Sizes: sm, default, lg, icon

### Forms

Form elements use:

- `<Label>` for form labels
- `<Input>` for text inputs
- `<Textarea>` for multi-line input
- `<Select>` for dropdowns
- Always include proper labels and validation feedback

### Cards

Cards use the `<Card>` component and related subcomponents:

- `<CardHeader>`, `<CardTitle>`, `<CardDescription>`
- `<CardContent>` for the main content
- `<CardFooter>` for actions

### Navigation

- **Main Navigation**: Site-wide navigation in the header
- **Dashboard Sidebar**: Left sidebar for authenticated users
- Always include ARIA attributes and current page indicators

## Accessibility Guidelines

- Use semantic HTML elements
- Provide text alternatives for images
- Ensure color is not the only means of conveying information
- Maintain WCAG AA contrast ratios
- Ensure keyboard navigability
- Use appropriate ARIA attributes when needed

## Layout Patterns

- **Content Pages**: Minimalist layout focusing on readable content
- **Dashboard Pages**: Compact, information-dense layout inspired by Linear

## Micro-Interactions

- Use subtle transitions for state changes (hover, focus, active)
- Button press effects
- Smooth theme toggling
- Form validation feedback

## Implementation Details

- Built using Tailwind CSS and CSS variables
- Uses Radix UI primitives for accessible interactive components
- No external UI framework dependencies

---

This design system is living documentation and will evolve as our application matures.
