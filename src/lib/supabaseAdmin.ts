import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let cachedClient: SupabaseClient<Database> | null = null;

function initClient(): SupabaseClient<Database> {
  if (cachedClient !== null) {
    return cachedClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || url === '' || key === undefined || key === '') {
    throw new Error('Supabase admin environment variables are missing');
  }
  cachedClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedClient;
}

// Export a proxy so existing `supabaseAdmin` imports keep working.
// The real client is only created on first property access, which happens
// at runtime on the server (after env vars are available), not at build.
export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = initClient();
      return client[prop as keyof SupabaseClient<Database>];
    },
    // Support calling supabaseAdmin() if some code kept the old API
    apply() {
      return initClient();
    },
  },
) as unknown as SupabaseClient<Database>;

// Prefer calling this helper in new code for explicitness.
export const getSupabaseAdmin = initClient;

/**
 * ----------------------------------------------------------------------------
 * Supabase Admin Client (Server-Side Only)
 * ----------------------------------------------------------------------------
 * This module initializes and exports a Supabase client configured with the
 * `SUPABASE_SERVICE_ROLE_KEY` for administrative operations.
 *
 * IMPORTANT:
 * - This client bypasses Row Level Security (RLS).
 * - It MUST ONLY be imported and used in server-side code (e.g., API Routes,
 *   Server Actions, or server-only modules).
 * - NEVER import or use this client in client-side components or code that
 *   might be bundled for the browser, as it would expose your service role key.
 *
 * Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correctly
 * set in your server environment variables.
 * ----------------------------------------------------------------------------
 */
