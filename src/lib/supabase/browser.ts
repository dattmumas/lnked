import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../database.types";
import { SupabaseClient } from "@supabase/supabase-js";

export const createSupabaseBrowserClient = (): SupabaseClient<Database> =>
  createBrowserClient<Database>();

const supabase = createSupabaseBrowserClient();
export default supabase;
