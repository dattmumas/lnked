import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Ensure environment variables are loaded (primarily for server-side environments)
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  // This check might be too aggressive if this file is tree-shaken effectively
  // but good for immediate feedback if keys are missing where it's used.
  // console.error('Supabase URL or Service Role Key is missing for admin client.');
  // Consider throwing an error here only if it's guaranteed to run server-side
  // and those vars are critical for module evaluation, which they are for createClient.
}

// This client is intended ONLY for server-side use where admin privileges are required.
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This key MUST be defined in the server environment
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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
