import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../database.types';

/**
 * Factory for a Supabase client configured for Next.js Server Actions.
 * Throws a clear error if required environment variables are missing.
 */
export const createSupabaseBrowserClient = (): SupabaseClient<Database> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || url === '' || anonKey === undefined || anonKey === '') {
    throw new Error(
      'Supabase environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing'
    );
  }

  return createBrowserClient<Database>(url, anonKey);
};

// Export a shared instance for convenience
const supabase = createSupabaseBrowserClient();
export default supabase;
