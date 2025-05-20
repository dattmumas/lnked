Task 2: Code Consistency, Linting & Type Safety Enhancements
Goal: Improve overall code quality by enforcing lint rules, consistent style, and strong typing throughout the project. This increases maintainability and reduces potential bugs.
Scope & Actions:
Run Lint/Format and Fix Issues: Use pnpm run lint (Next’s ESLint config is in place
github.com
) and fix all warnings or errors. Address any stylistic inconsistencies (spaces, semicolons, etc.) by introducing a Prettier config if not present, so that formatting is standardized across the codebase.
Strengthen TypeScript Strictness: With strict: true in tsconfig.json
github.com
, resolve any remaining any types or type assertions in the code. For example, in src/lib/stripe.ts, avoid using as any for the API version
github.com
by updating type definitions or the Stripe library version. Ensure all Supabase responses and form data use the proper generated types (e.g. types from Database in database.types.ts) instead of untyped objects.
Refactor Duplicate Schema Definitions: Unify Zod schemas and types for similar features. For instance, the New Post form and Edit Post form currently define very similar validation schemas separately. Extract a common PostSchema that can be shared, to avoid divergence. (The project notes mention merging these schemas for unified form handling
github.com
.) This ensures that rules (like minimum content length or required title) stay consistent between creating and editing posts.
Improve Naming & Comments: Audit variable and function names for clarity – e.g., avoid abbreviations and use descriptive names for actions and handlers. Add JSDoc or comments to complex logic (such as custom Lexical nodes or Supabase action functions) to explain their purpose. This will help future contributors and align with the detailed style seen in files like supabaseAdmin.ts
github.com
.
Developer Experience Tweaks: Consider setting up Git hooks (using Husky or a simple npm script) to run linting and tests on commit, preventing bad code from slipping in. Also update the README if needed to instruct developers on these conventions (coding style, how to run lint/tests). By enforcing consistency in development, the codebase remains clean and errors are caught early.
