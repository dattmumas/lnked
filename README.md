# Lnked - Collaborative Newsletter Platform (MVP)

Lnked is a collaborative newsletter platform built with Next.js 13 (App Router), Supabase, Stripe, Tailwind CSS, and Shadcn UI.

This MVP (Minimum Viable Product) focuses on core features: public collective pages with posts, an authenticated writer dashboard, Supabase-secured CRUD, Stripe single-tier subscriptions, and a basic "like" reaction.

## Key Technologies

- **Framework**: [Next.js 13](https://nextjs.org/) (App Router, React Server Components, Route Handlers)
- **Database & Auth**: [Supabase](https://supabase.io/) (PostgreSQL, Auth, RLS, Edge Functions)
- **Payments**: [Stripe](https://stripe.com/) (Checkout, Webhooks)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Project Structure

```
lnked-project/
├── src/
│   ├── app/                     # Next.js App Router routes
│   │   ├── (auth)/              # Auth pages (sign-in, sign-up)
│   │   ├── dashboard/           # Authenticated writer dashboard
│   │   ├── [collectiveSlug]/    # Public collective & post pages
│   │   └── api/                 # API Route Handlers
│   ├── components/              # Reusable UI components
│   │   └── ui/                  # Shadcn UI components
│   ├── lib/                     # Helper modules (Supabase, Stripe, types, hooks)
│   │   └── ... (other src files)
│   ├── supabase/
│   │   ├── migrations/             # SQL database migrations
│   │   └── functions/              # Supabase Edge Functions (e.g., stripe-webhook)
│   ├── public/                      # Static assets
│   ├── .env.local.example           # Example environment variables
│   ├── next.config.mjs              # Next.js configuration
│   ├── postcss.config.mjs           # PostCSS configuration (for Tailwind)
│   ├── tailwind.config.ts         # Tailwind CSS configuration
│   └── tsconfig.json                # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- [npm](https://www.npmjs.com/) (or [yarn](https://yarnpkg.com/)/[pnpm](https://pnpm.io/))
- [Supabase Account](https://supabase.com/dashboard)
- [Stripe Account](https://dashboard.stripe.com/register)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

### 1. Clone the Repository (if applicable)

```bash
# git clone <repository-url>
# cd lnked-project
```

### 2. Install Dependencies

```bash
npm install
# or
# yarn install
# or
# pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file and populate it with your actual keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys from Supabase and Stripe:

- `NEXT_PUBLIC_SUPABASE_URL`: Found in your Supabase project's API settings.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in your Supabase project's API settings (this is the public anonymous key).
- `SUPABASE_SERVICE_ROLE_KEY`: Found in your Supabase project's API settings (this is a secret key, keep it safe!).
- `STRIPE_SECRET_KEY`: Your Stripe secret key (e.g., `sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Secret for verifying Stripe webhooks. You'll get this when setting up the webhook endpoint (e.g., `whsec_...`).
- `STRIPE_PRICE_ID`: The ID of your single subscription tier Price object in Stripe (e.g., `price_...`).
- `NEXT_PUBLIC_SITE_URL`: Your local development URL (default: `http://localhost:3000`). This is used for Stripe redirects.

### 4. Set Up Supabase Locally

If you haven't already, link your local project to your Supabase project (only needed once per machine/project):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# Replace YOUR_PROJECT_REF with the reference ID from your Supabase project's dashboard URL (e.g., abcdefghijklmnop).
```

Start Supabase services (local Postgres database, etc.):

```bash
supabase start
```

This will output local Supabase credentials. While `.env.local` uses your cloud Supabase for a typical setup, `supabase start` is for local emulation. For this project, ensure your `.env.local` points to your desired Supabase instance (cloud or local if configured).

Apply database migrations:

```bash
supabase db reset # Use with caution, resets local DB and applies migrations
# or if you have existing data and want to apply new migrations:
# supabase migration up
```

(The provided migrations set up the schema and RLS policies.)

### 5. Set Up Stripe Webhook (for local development)

Stripe needs to send webhook events to your local development server. The Stripe CLI can forward these events.

**a. Next.js Webhook Handler:**
The project includes a Next.js API route at `/api/stripe-webhook` for local development webhook handling.

**b. Supabase Edge Function (Production):**
For production, a Supabase Edge Function at `supabase/functions/stripe-webhook/` is provided. Deploy this to your Supabase project.

**c. Stripe CLI Forwarding:**

Listen for events and forward them to your Next.js local webhook handler:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

This command will output a webhook signing secret (e.g., `whsec_...`). **Use this for your `STRIPE_WEBHOOK_SECRET` environment variable specifically for local development testing with this CLI command.**

For your deployed Supabase Edge Function, you will create a separate webhook endpoint in the Stripe Dashboard and use the signing secret provided there for your production `STRIPE_WEBHOOK_SECRET` (usually set in Supabase function environment variables).

### 6. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
# yarn dev
# or
# pnpm dev
```

Your application should now be running on `http://localhost:3000`.

## Key Workflows & Features

- **Authentication**: Sign-up and Sign-in using Supabase Auth.
- **Collective Creation**: Authenticated users can create new collectives from their dashboard.
- **Post Creation**: Collective owners can create new posts within their collectives.
- **Public Viewing**: Collectives and their posts are publicly viewable.
- **Subscriptions**: Users can subscribe to a single tier via Stripe Checkout.
- **Likes**: Users can like/unlike posts.
- **Stripe Webhooks**: Sync subscription status and customer data between Stripe and your Supabase DB.
  - Local Dev: Handled by `/api/stripe-webhook` via Stripe CLI forwarding.
  - Production: Handled by `supabase/functions/stripe-webhook` Edge Function.

## Supabase Database Schema

- `users`: Mirrors `auth.users` with app-specific roles.
- `collectives`: Newsletter groups.
- `posts`: Individual articles.
- `likes`: User likes on posts.
- `customers`: Maps Supabase users to Stripe Customer IDs.
- `subscriptions`: Stores Stripe subscription details.

Row Level Security (RLS) is enabled on all tables to protect data.

## Linting & Type Checking

- Run ESLint: `npm run lint`
- Run TypeScript type checker: `npm run typecheck` (add this script to `package.json`: `"typecheck": "tsc --noEmit"`)

## Further Development (Out of Scope for MVP)

- Multi-tier subscriptions.
- Revenue sharing logic.
- Advanced analytics.
- Inviting other writers to a collective.
- Detailed content paywalling (beyond simple public/private).
- Post editing and deletion UI.

---

This README provides a starting point. Feel free to expand it as the project grows.
# lnked
