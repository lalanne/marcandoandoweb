import { execFileSync, execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { anonClient } from "./helpers";

// The script that creates the one admin account (issue #19). It runs with the
// service role, which only this script and these tests ever use.
function localServiceEnv(): { url: string; serviceKey: string } {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) return { url, serviceKey };
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
  return { url: env.API_URL, serviceKey: env.SERVICE_ROLE_KEY };
}

function runScript(extra: Record<string, string>) {
  const { url, serviceKey } = localServiceEnv();
  return execFileSync("node", ["scripts/create-admin.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_URL: url,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      ...extra,
    },
  });
}

describe("scripts/create-admin.mjs", () => {
  const email = `admin-script-${Date.now().toString(36)}@marcandoando.test`;
  const password = "local-only-script-pass";

  it("creates a user who signs in and is the admin", async () => {
    runScript({ ADMIN_EMAIL: email, ADMIN_PASSWORD: password });
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    expect(error).toBeNull();
    expect(data.user?.app_metadata.role).toBe("admin");
    // The database agrees: a product insert (admin only) is allowed.
    const { data: ok } = await client.rpc("is_admin");
    expect(ok).toBe(true);
  });

  it("run again, it resets the password and keeps the role", async () => {
    const newPassword = "local-only-script-pass-2";
    runScript({ ADMIN_EMAIL: email, ADMIN_PASSWORD: newPassword });
    const { error } = await anonClient().auth.signInWithPassword({
      email,
      password: newPassword,
    });
    expect(error).toBeNull();
  });

  it("refuses to run without the email and password", () => {
    expect(() =>
      runScript({ ADMIN_EMAIL: "", ADMIN_PASSWORD: "" }),
    ).toThrow();
  });

  it("cleans up the user it created", async () => {
    const { url, serviceKey } = localServiceEnv();
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const user = data.users.find((u) => u.email === email);
    expect(user).toBeDefined();
    const { error } = await admin.auth.admin.deleteUser(user!.id);
    expect(error).toBeNull();
  });
});
