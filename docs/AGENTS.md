## Project Overview

Lnked is a Next.js 13 application using Supabase for the backend, implementing a newsletter/content platform with video capabilities via Mux integration.

## Architecture

- Frontend: Next.js 13 with App Router, React Server Components
- Database: Supabase (PostgreSQL)
- Video: Mux API integration
- Auth: Supabase Auth
- Payments: Stripe
- UI Components: shadcn/ui pattern with Tailwind CSS

## Coding Standards

- TypeScript for all new code
- Server Components by default, Client Components only when needed
- Zod schemas for validation
- Server Actions for mutations
- Tailwind CSS for styling
- Use existing UI components from /components/ui/

## Testing Requirements

- Jest for unit tests
- Playwright for E2E tests
- Run tests with: pnpm test
- Minimum 80% coverage for new features

## Database Conventions

- UUID primary keys
- snake_case for column names
- Timestamptz for dates
- Row Level Security enabled

## API Conventions

- RESTful endpoints in /app/api/
- Server Actions in /app/actions/
- Return format: { data?: T, error?: string }
- Always validate input with Zod
- Use existing Supabase clients from /lib/supabase/

## Component Structure

- Reusable UI in /components/ui/
- Feature components in /components/app/
- Use existing UI components (Button, Card, etc.)
- Client components only when needed (use client directive)

## Git Workflow

- Branch naming: feat/description, fix/description
- Commit format: "type: description"
- PR should include tests
- Keep PRs focused on single feature

## File Naming

- Components: PascalCase.tsx
- Utilities: camelCase.ts
- Types: types.ts or inline
- Tests: _.test.ts or _.spec.ts

MOST IMPORTANT INSTRUCTION:: FIX ALL LINT ERRORS
