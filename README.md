# Lnked

A modern, accessible, and extensible publishing platform for newsletters, collectives, and collaborative content.

## ✨ Features

- **Personal Newsletters**: Create and manage your own newsletter, publish posts, and grow your audience.
- **Collectives**: Join or create collectives for collaborative publishing and shared audiences.
- **Rich Post Editor**: Powerful, extensible editor built with [Lexical](https://lexical.dev/) supporting:
  - Rich text, lists, code, tables, embeds (images, GIFs, polls, tweets, YouTube, Excalidraw, etc.)
  - Slash/typeahead menu for fast block/command insertion
  - Markdown shortcuts, autosave, and more
- **Atomic Design System**: Custom UI components (no third-party UI kits) with full accessibility and dark mode support.
- **Supabase Integration**: Auth, database, and real-time features via [Supabase](https://supabase.com/).
- **SSR & SEO**: Built on Next.js App Router for fast, SEO-friendly, server-rendered pages.
- **Accessibility**: All dialogs, forms, and navigation are accessible and screen-reader friendly (Radix UI, ARIA, etc.)

## 🛠️ Tech Stack

- [Next.js](https://nextjs.org/) (App Router, SSR, API routes)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) (utility-first, design tokens, dark mode)
- [Lexical](https://lexical.dev/) (rich text editor, custom nodes/plugins)
- [Supabase](https://supabase.com/) (auth, database, storage, real-time)
- [Radix UI](https://www.radix-ui.com/docs/primitives/components/dialog) (accessible primitives: Dialog, Menu, etc.)
- [Lucide Icons](https://lucide.dev/)
- [Zod](https://zod.dev/) (schema validation)
- [React Hook Form](https://react-hook-form.com/) (forms)
- [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) (testing)

## 🏗️ Architecture & Conventions

- **Atomic Design**: Components organized as atoms, molecules, organisms in `src/components/ui` and `src/components/app`.
- **Custom UI Only**: No third-party UI kits; all UI is custom and accessible.
- **Server-first**: Data fetching and auth via server components and API routes.
- **Accessibility**: All dialogs require a `DialogTitle`, all forms use labels, keyboard navigation is supported.
- **Editor Extensibility**: Add new blocks/nodes by creating a custom Lexical node and registering it in the editor.
- **Dark Mode**: Fully supported via Tailwind and design tokens.

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## 📚 Documentation & Resources

- [Lexical Docs](https://lexical.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs/primitives/components/dialog)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Lnked** is built for modern publishing, collaboration, and extensibility. For questions, see the code comments, or open an issue.
