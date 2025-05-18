import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../database.types";

export async function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies });
}
