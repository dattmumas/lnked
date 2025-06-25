1. Stabilise your low-level primitives first
   ❶ Component wrappers (Select / Tooltip / DropdownMenu)
   Fix the wrapper types once, instead of suppressing every consumer.
   Re-export the Radix primitives verbatim, e.g.
   Apply
   ;
   If you need extra props, extend with intersection types rather than “any”.
   ❷ Provide a generic overload for onValueChange
   Apply
   }
   Now components like ArticleList can keep handleFilterChange(value: FilterType) without casts.
2. Isolate tenant-aware data access
   The wave of tenant_id errors means inserts / upserts no longer satisfy the DB type.
   Best practice:
   Put all Supabase writes behind a thin repository / service layer (src/lib/data-access/...).
   Add helpers that automatically pull tenant_id from the current session / context so callers never supply it manually:
   Apply
   }
   Migrate existing code-paths file-by-file to the new helpers; leave TODOs where the logic is still mixed.
3. Fix the easy solver errors up-front
   • Narrow-widening mismatches ((value: SortOption) vs (value: string)) – fix at the wrapper just like step 1 so handlers stay strongly typed.
   Literal-boolean errors (true only) – change the Zod schema / DB column to boolean or store true as a union literal if that is intentional.
   Rename DTO fields (fullName → full_name) once in the type definition or use a transformer when reading the form.
4. Introduce a temporary “type-safety budget”
   You probably can’t migrate all inserts to multi-tenant in one PR.
   Until the refactor is done:
   Add // @ts-expect-error tenant-migration directly above unavoidable violations so they are counted and searchable – and removed later.
   Block new violations in CI by running pnpm typecheck and failing if the count of tenant-migration comments increases.
5. Automate regression protection
   • Enable eslint-plugin-deprecation and eslint-plugin-boundaries so code outside lib/data-access cannot import Supabase directly anymore.
   Add a Jest/Playwright integration test that signs in as two tenants and asserts data isolation – that will quickly reveal any path that forgot to set tenant_id.
