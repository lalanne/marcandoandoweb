import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Local demo keys only. They come from the environment (CI sets them) or from
// `supabase status`, read at run time. Nothing is committed.
function localConfig(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (url && anonKey) return { url, anonKey };
  const out = execSync("npx supabase status -o env", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const env = Object.fromEntries(
    out
      .split("\n")
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
  return { url: env.API_URL, anonKey: env.ANON_KEY };
}

const config = localConfig();

// Fake local users created by supabase/seed.sql. Local only, never production.
export const ADMIN = {
  email: "admin@marcandoando.test",
  password: "local-only-admin-pass",
};
export const NON_ADMIN = {
  email: "cliente@marcandoando.test",
  password: "local-only-cliente-pass",
};

export function anonClient(): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signedInClient(user: {
  email: string;
  password: string;
}): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword(user);
  if (error) throw new Error(`Sign-in failed for ${user.email}: ${error.message}`);
  return client;
}

let counter = 0;
export function uniqueSlug(prefix: string): string {
  counter += 1;
  return `test-${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Throws when a Supabase call failed, so fixtures never fail silently. */
// Rows are untyped here (no generated types yet), hence `any`.
export function ok(result: {
  data: unknown;
  error: { message: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
