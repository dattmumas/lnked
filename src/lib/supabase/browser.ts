import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';

/**
 * Lazily-initialised singleton Supabase browser client.
 * Every import across the app shares the same WebSocket and auth state.
 */
let supabaseSingleton: SupabaseClient<Database> | null = null;

export const createSupabaseBrowserClient = (): SupabaseClient<Database> => {
  if (supabaseSingleton !== null) {
    return supabaseSingleton;
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
      'Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing'
    );
  }

  supabaseSingleton = createBrowserClient<Database>(url, anonKey);
  return supabaseSingleton;
};

// Create the singleton instance immediately
const supabase = createSupabaseBrowserClient();

// Export the singleton instance directly
export default supabase;

// Also export the factory function for cases where you need it
export { createSupabaseBrowserClient as createClient };
