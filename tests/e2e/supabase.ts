import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus(): Record<string, string> {
  const out = execSync("npx supabase status -o env", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return Object.fromEntries(
    out
      .split("\n")
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

// Local Supabase demo URL and anon key. They come from the environment (CI sets
// them) or from `supabase status`, read at run time. Nothing is committed.
export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) return { url, anonKey };
  const env = localStatus();
  return { url: env.API_URL, anonKey: env.ANON_KEY };
}

// A throwaway admin for one spec file. Signing out revokes every session of a
// user, so tests that sign out ([002-AC10]) must not share the seeded admin
// with tests that run at the same time. Local test database only; the
// service-role key never reaches the app, only this test setup.
export async function createTestAdmin(label: string): Promise<{
  email: string;
  password: string;
  remove: () => Promise<void>;
}> {
  const { url } = supabaseEnv();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? localStatus().SERVICE_ROLE_KEY;
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `e2e-${label}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}@marcandoando.test`;
  const password = `local-only-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "No user created");
  const id = data.user.id;
  return {
    email,
    password,
    remove: async () => {
      await service.auth.admin.deleteUser(id);
    },
  };
}

// Puts a tiny file at the path of the seeded demo photo (the seed has the row but
// no file), so the public page loads without a 404. Local test database only.
const PIXEL = Buffer.from(
  "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
  "base64",
);
export async function withDemoPhotoFile(path: string): Promise<() => Promise<void>> {
  const { url } = supabaseEnv();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? localStatus().SERVICE_ROLE_KEY;
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await service.storage
    .from("images")
    .upload(path, PIXEL, { contentType: "image/webp", upsert: true });
  if (error) throw new Error(error.message);
  return async () => {
    await service.storage.from("images").remove([path]);
  };
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
