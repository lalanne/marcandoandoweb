import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous Supabase client for public reads (the one-page site). It carries no
 * session: row-level security lets the anonymous role read published rows only.
 * Safe on the server; the anon key is public by design.
 */
export function createPublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
