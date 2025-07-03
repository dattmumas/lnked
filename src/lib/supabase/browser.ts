import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';

/**
 * Lazily-initialised singleton Supabase browser client.
 * Every import across the app shares the same WebSocket and auth state.
 */

// Reuse the same client across Hot-Refresh by stashing it on `globalThis`.
// The Browser (HMR) runtime replaces module instances on every compile, so a
// simple module-level singleton is not enough – we must persist it on the
// cross-reload global object.
//
 
const globalForSupabase = globalThis as unknown as {
  // Use `unknown` to avoid type incompatibility between differing module copies
  __supabase?: unknown;
};

// Internal cache uses `any` to avoid subtle type duplication issues between
// different versions of the Supabase types during Hot-Refresh recompiles.
// We cast to the precise generic type only at the public boundaries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseSingleton = globalForSupabase.__supabase as any;

export const createSupabaseBrowserClient = (): SupabaseClient<Database> => {
  if (supabaseSingleton) {
    return supabaseSingleton as SupabaseClient<Database>;
  }

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;

  if (
    url === undefined ||
    url === '' ||
    anonKey === undefined ||
    anonKey === ''
  ) {
    throw new Error(
      'Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing',
    );
  }

  supabaseSingleton = createBrowserClient<Database>(url, anonKey);

  // Store using loose typing to prevent indirect type conflicts across HMR
  (globalForSupabase as { __supabase?: unknown }).__supabase =
    supabaseSingleton;
  return supabaseSingleton as SupabaseClient<Database>;
};

// Create the singleton instance immediately
const supabase = createSupabaseBrowserClient();

// Export the singleton instance directly
export default supabase;

// Also export the factory function for cases where you need it
export { createSupabaseBrowserClient as createClient };
