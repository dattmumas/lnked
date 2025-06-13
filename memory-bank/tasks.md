1 · Problem Statement
Your project exhibits ESLint violations and TypeScript type-check failures that slow development and mask defects. The Memory Bank system needs a disciplined, repeatable pipeline to guarantee 0 lint errors and 0 type errors on every commit inside Cursor.

2 · Goal
Establish a robust lint-and-typesafety baseline that:

Enforces the repository’s agreed style rules.

Eliminates all current ESLint and tsc --noEmit errors.

Prevents regressions via automated hooks and CI.

3 · Deliverables

# Artifact Location

1 Updated ESLint configuration reflecting the repo’s style-guide (rules, plugins, extends). /eslint.config.js or .eslintrc._
2 Type-safe build script (pnpm typecheck) with zero errors. package.json scripts
3 Schema-to-Type generator (e.g., supabase gen types or prisma generate) wired to the build to stop DB-model mismatches. /scripts/generate-types._
4 Husky + lint-staged pre-commit hook running pnpm lint && pnpm typecheck. .husky/
5 CI workflow (.github/workflows/quality.yml) that blocks merges on lint/type failures. GitHub Actions

4 · Acceptance Criteria
pnpm lint exits with code 0 and prints “✔ Clean”.m

pnpm typecheck exits with code 0 and no diagnostics.

New pull requests fail CI if either step errors.

Developer docs updated (README → “Development Standards” section).
