import { execSync } from "node:child_process";

// Local Supabase demo URL and anon key. They come from the environment (CI sets
// them) or from `supabase status`, read at run time. Nothing is committed.
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

// Fake local users created by supabase/seed.sql. Local only, never production.
export const ADMIN = {
  email: "admin@marcandoando.test",
  password: "local-only-admin-pass",
};
export const NON_ADMIN = {
  email: "cliente@marcandoando.test",
  password: "local-only-cliente-pass",
};
