import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Issue #134: Server-Timing on /img and on the product-page check, so the time
// spent in Supabase can be read from outside. Successful responses only: a 404
// (unpublished or unknown) carries no timing, so it reveals nothing more.
// Fake products and a tiny generated PNG, created as a throwaway admin.

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const folder = `e2e-timing-${run}`;
const published = { slug: `e2e-timing-pub-${run}`, photo: `${folder}/pub.png` };
const draft = { slug: `e2e-timing-draft-${run}`, photo: `${folder}/draft.png` };

// Durations and the cold flag only (lib/server-timing.ts).
const timing = (metric: string) =>
  new RegExp(`^${metric};dur=\\d+(\\.\\d)?, cold;desc="[01]"$`);

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];

test.beforeAll(async () => {
  const created = await createTestAdmin("timing");
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await admin.auth.signInWithPassword(created);
  if (signIn.error) throw new Error(signIn.error.message);

  for (const [item, isPublished] of [
    [published, true],
    [draft, false],
  ] as const) {
    const p = await admin
      .from("product")
      .insert({
        slug: item.slug,
        name: `Polera e2e timing ${item.slug}`,
        kind: "producto",
        is_published: isPublished,
        is_available: true,
      })
      .select("id")
      .single();
    if (p.error) throw new Error(p.error.message);
    productIds.push(p.data.id);
    const up = await admin.storage
      .from("images")
      .upload(item.photo, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(up.error.message);
    const img = await admin.from("image").insert({
      storage_path: item.photo,
      alt_text: "Foto de prueba",
      position: 1,
      product_id: p.data.id,
    });
    if (img.error) throw new Error(img.error.message);
  }
});

test.afterAll(async () => {
  await admin.storage.from("images").remove([published.photo, draft.photo]);
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
  await removeAdmin();
});

test("a published photo carries the storage time; a refused one carries none", async ({
  request,
}) => {
  const ok = await request.get(`/img/${published.photo}`);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["server-timing"]).toMatch(timing("storage"));
  // The cache rule is unchanged (spec 002, criteria 25 and 26).
  expect(ok.headers()["cache-control"]).toContain("max-age=300");

  for (const path of [draft.photo, `${folder}/no-existe.png`]) {
    const refused = await request.get(`/img/${path}`);
    expect(refused.status(), path).toBe(404);
    expect(refused.headers()["server-timing"], path).toBeUndefined();
  }
});

test("a published product page carries the check's database time; a 404 carries none", async ({
  request,
}) => {
  const ok = await request.get(`/productos/${published.slug}`);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["server-timing"]).toMatch(timing("db"));

  for (const slug of [draft.slug, `no-existe-${run}`]) {
    const missing = await request.get(`/productos/${slug}`);
    expect(missing.status(), slug).toBe(404);
    expect(missing.headers()["server-timing"], slug).toBeUndefined();
  }
});

test("/api/health carries the database time", async ({ request }) => {
  const ok = await request.get("/api/health");
  expect(ok.status()).toBe(200);
  expect(ok.headers()["server-timing"]).toMatch(timing("db"));
});
