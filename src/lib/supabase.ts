import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types"; // Assuming you will generate this file
import { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type if not already there

// For client-side components
export const createSupabaseBrowserClient = (): SupabaseClient<Database> =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

/**
 * ----------------------------------------------------------------------------
 * Supabase Client Notes (Client & SSR/RSC Safe):
 * ----------------------------------------------------------------------------
 * This file provides helpers for creating Supabase clients for client-side code
 * and for server-side rendering contexts (SSR/RSC) that need user session awareness.
 *
 * 1. `createSupabaseBrowserClient()`:
 *    - For use in client components (`'use client'`).
 *
 * Server-Side (SSR/RSC, Server Actions, Route Handlers with user context):
 * Use helpers from `@supabase/ssr` like `createServerClient`, `createRouteHandlerClient`,
 * `createMiddlewareClient` directly in your server-side files, passing cookie handlers.
 * See examples in the official Supabase documentation or in specific server-side files
 * within this project (e.g., Server Actions, Route Handlers).
 *
 * Admin Client:
 * For operations requiring admin privileges (bypassing RLS with a service role key),
 * import `supabaseAdmin` from '@/lib/supabaseAdmin'. This admin client should
 * ONLY be used in server-side code (API Routes, Server Actions).
 * ----------------------------------------------------------------------------
 */

// Default export: a pre-initialized browser client for convenience in client components.
const supabase = createSupabaseBrowserClient();
export default supabase;
