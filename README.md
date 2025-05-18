# Lnked – Newsletter & Collective Publishing Platform

> **Stack:** Next.js 15 (App Router), Supabase (Postgres + Auth + RLS), Tailwind CSS 3.x (design-token system), Stripe, PNPM, GitHub Actions.

The goal is a **Substack-meets-Linear** experience: minimalist reading surfaces, power-user writer dashboard, realtime stats, and a design-token driven UI kit.

---

## 1 · Tech Overview

| Layer         | Package / Service                             | Notes                                                                 |
| ------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Web Framework | **Next.js 15**                                | App Router, RSC, Route Handlers                                       |
| Styling       | **Tailwind CSS 3.4**                          | Locked to v3 until dedicated v4 migration (see `/tailwind_rules.yml`) |
| DB + Auth     | **Supabase**                                  | Postgres, RLS, Storage, Realtime                                      |
| Payments      | **Stripe**                                    | Checkout, webhooks, subscription ledger                               |
| State & Forms | React Query • Zustand • React-Hook-Form + Zod |
| CI            | GitHub Actions                                | lint → test → build → typecheck                                       |

---

## 2 · Repository Layout

```
lnked-project/
├─ src/
│  ├─ app/                     # Next.js routes (RSC)
│  │  ├─ (auth)/               # sign-in / sign-up
│  │  ├─ dashboard/            # protected writer area
│  │  ├─ newsletters/          # user newsletter pages
│  │  ├─ api/                  # Route-Handlers (CRUD, Stripe etc.)
│  │  └─ …
│  ├─ components/
│  │  ├─ ui/                   # Radix-based atomic primitives
│  │  └─ app/                  # domain components (posts, collectives)
│  ├─ lib/                     # hooks, schema, Supabase helpers
│  └─ tests/                   # Playwright e2e
├─ public/                     # static assets
├─ supabase/                   # SQL, edge functions
├─ .github/workflows/ci.yml    # lint + test + build pipeline
└─ tailwind_rules.yml          # hard-stop rules that block bad Tailwind edits
```

---

## 3 · Quick Start

```bash
corepack enable                # ensures pnpm is available
git clone https://github.com/<you>/lnked.git
cd lnked-project
pnpm install                   # uses committed pnpm-lock.yaml
cp .env.local.example .env.local  # add Supabase + Stripe creds
pnpm dev                       # NEXT_SKIP_TURBOPACK=1 if you prefer webpack
```

> Tailwind tokens live in `src/app/globals.css` → edit CSS variables only, never hard-code hex in markup.

---

## 4 · CI & Rule Sets

### 4.1 GitHub Actions (`.github/workflows/ci.yml`)

• installs pnpm via `pnpm/action-setup@v3`
• `pnpm install --frozen-lockfile`
• `pnpm run lint && pnpm run test && pnpm run build`

### 4.2 Tailwind Guardrails (`tailwind_rules.yml`)

| Rule   | Level | Summary                                                                                                                            |
| ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| TW-001 | MUST  | Keep **Tailwind 3.x** until a tracked v4 migration PR.                                                                             |
| TW-002 | MUST  | PostCSS plugin key must be `tailwindcss: {}` (no `@tailwindcss/postcss`).                                                          |
| TW-003 | MUST  | Ensure `node_modules/.bin/tailwindcss` exists after install.                                                                       |
| TW-010 | MUST  | No color-only `@apply` utilities (`border-border`, `text-foreground` etc.). Must pair with base property (`border border-border`). |
| TW-030 | MUST  | CI runs `pnpm run build`; unknown utility errors block the merge.                                                                  |

---

## 5 · Environment Variables (`.env.local`)

| Variable                        | Description                       |
| ------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service key (server only)         |
| `STRIPE_SECRET_KEY`             | Stripe secret API key             |
| `STRIPE_WEBHOOK_SECRET`         | Webhook signing secret            |
| `STRIPE_PRICE_ID`               | Single-tier subscription Price ID |
| `NEXT_PUBLIC_SITE_URL`          | e.g. `http://localhost:3000`      |

---

## 6 · Scripts

| Script           | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Next.js dev server (RSC)                 |
| `pnpm lint`      | ESLint (import/order, unused vars, etc.) |
| `pnpm test`      | Jest + React Testing Library             |
| `pnpm build`     | Production build (`next build`)          |
| `pnpm typecheck` | `tsc --noEmit`                           |

---

## 7 · Common Tasks

### 7.1 Create a Collective

```bash
1. Sign in ➜ Dashboard ➜ "Create Collective"
```

### 7.2 Write a Post

```bash
Dashboard ➜ Collective ➜ "New Post" (Markdown editor with Tiptap)
```

### 7.3 Publish Personal Newsletter

```bash
Dashboard ➜ "Write New Personal Post"
```

---

## 8 · Deployment Notes

1. **Vercel** or **Supabase Edge Functions** for Next.js API routes (both supported).
2. Add all env-vars to the hosting provider UI.
3. Stripe webhooks → point to `/api/stripe-webhook` in staging; to Supabase Edge Function in production.

---

## 9 · Contributing

1. Create feature branch `git checkout -b feat/<topic>`
2. Follow coding rules (Atomic design, no color-only `@apply`, no Tailwind v4).
3. Run `pnpm lint && pnpm test && pnpm build` locally.
4. Commit + push, open PR – CI must be green.

---

Happy writing ✍️ and shipping 🚀!
