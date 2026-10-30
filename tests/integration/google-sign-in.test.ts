import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import {
  ADMIN,
  ADMIN_TWO,
  NON_ADMIN,
  anonClient,
  localSupabase,
  signedInClient,
} from "./helpers";

// The Google round trip itself needs a real Google account and is checked by
// hand (specs/traceability-exemptions.txt). What the database decides after it
// is the same for every sign-in method: public.is_admin() reads the signed
// token's app_metadata.role. These tests prove that part, as real users.

function serviceKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = execSync("npx supabase status -o env", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const match = out.match(/^SERVICE_ROLE_KEY="?(.*?)"?$/m);
  if (!match) throw new Error("No SERVICE_ROLE_KEY from supabase status");
  return match[1];
}

const service = createClient(localSupabase.url, serviceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdIds: string[] = [];
afterAll(async () => {
  for (const id of createdIds) await service.auth.admin.deleteUser(id);
});

async function newAdmin(label: string, role: string | null = "admin") {
  const email = `g-${label}-${Date.now().toString(36)}@marcandoando.test`;
  const password = `local-only-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: role ? { role } : {},
  });
  if (error || !data.user) throw new Error(error?.message ?? "no user");
  createdIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

describe("several admins (spec 005)", () => {
  it("[005-AC12] both seeded admins pass the admin gate", async () => {
    for (const user of [ADMIN, ADMIN_TWO]) {
      const client = await signedInClient(user);
      const { data } = await client.rpc("is_admin");
      expect(data, user.email).toBe(true);
      const { data: session } = await client.auth.getUser();
      expect(session.user?.app_metadata.role).toBe("admin");
    }
  });

  it("[005-AC12] the two admins are different users", async () => {
    const one = await signedInClient(ADMIN);
    const two = await signedInClient(ADMIN_TWO);
    const a = (await one.auth.getUser()).data.user?.id;
    const b = (await two.auth.getUser()).data.user?.id;
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("[005-AC12] an admin created with the service role also passes", async () => {
    const user = await newAdmin("extra");
    const { data } = await (await signedInClient(user)).rpc("is_admin");
    expect(data).toBe(true);
  });

  it("[005-AC12] an admin whose role is removed is refused", async () => {
    const user = await newAdmin("revoked");
    await service.auth.admin.updateUserById(user.id, { app_metadata: { role: null } });
    const client = await signedInClient(user);
    expect((await client.rpc("is_admin")).data).toBe(false);
    expect((await client.auth.getUser()).data.user?.app_metadata.role).toBeUndefined();
  });

  it("[005-AC12] an admin whose user is deleted cannot sign in", async () => {
    const user = await newAdmin("deleted");
    await service.auth.admin.deleteUser(user.id);
    const { error } = await anonClient().auth.signInWithPassword(user);
    expect(error).not.toBeNull();
  });
});

describe("the role cannot come from the client (spec 005)", () => {
  it("[005-AC5] editing one's own metadata does not make an admin", async () => {
    const user = await newAdmin("plain", null);
    const client = await signedInClient(user);
    await client.auth.updateUser({ data: { role: "admin" } });
    await client.auth.refreshSession();
    expect((await client.rpc("is_admin")).data).toBe(false);
  });

  it("[005-AC4] a signed-in non-admin cannot read admin data", async () => {
    const client = await signedInClient(NON_ADMIN);
    expect((await client.rpc("is_admin")).data).toBe(false);
    const { data } = await client.from("product").select("id").eq("is_published", false);
    expect(data ?? []).toEqual([]);
  });
});
