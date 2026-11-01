import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, supabaseEnv } from "./supabase";

// Spec 002, "Image privacy" (criteria 25 and 26). Fake products and tiny
// generated PNGs, created through the admin session and removed afterwards.

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function adminClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword(ADMIN);
  if (error) throw new Error(error.message);
  return client;
}

let admin: SupabaseClient;
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const published = { name: `Producto e2e publicado ${run}`, path: `e2e-${run}/publicado.png` };
const draft = { name: `Producto e2e borrador ${run}`, path: `e2e-${run}/borrador.png` };
const productIds: string[] = [];

test.beforeAll(async () => {
  admin = await adminClient();
  for (const [item, isPublished, slug] of [
    [published, true, `e2e-pub-${run}`],
    [draft, false, `e2e-draft-${run}`],
  ] as const) {
    const up = await admin.storage
      .from("images")
      .upload(item.path, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(up.error.message);
    const p = await admin
      .from("product")
      .insert({ slug, name: item.name, is_published: isPublished })
      .select("id")
      .single();
    if (p.error) throw new Error(p.error.message);
    productIds.push(p.data.id);
    const img = await admin.from("image").insert({
      storage_path: item.path,
      alt_text: "Imagen de prueba",
      product_id: p.data.id,
    });
    if (img.error) throw new Error(img.error.message);
  }
});

test.afterAll(async () => {
  await admin.storage.from("images").remove([published.path, draft.path]);
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
});

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("[002-AC26] a published image loads on the public page through /img with a short public cache", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator("article", { hasText: published.name });
  await expect(card).toBeVisible({ timeout: 20_000 });
  const img = card.locator("img");
  await expect(img).toHaveAttribute("src", `/img/${published.path}`);
  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);

  const res = await page.request.get(`/img/${published.path}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(res.headers()["cache-control"]).toBe(
    "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
  );
});

test("[002-AC25] the public page never shows an unpublished product or its image", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator("article", { hasText: published.name }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(draft.name)).toHaveCount(0);
  await expect(page.locator(`img[src="/img/${draft.path}"]`)).toHaveCount(0);
});

test("[002-AC25] an unpublished image returns 404 at /img for the public", async ({
  request,
}) => {
  const res = await request.get(`/img/${draft.path}`);
  expect(res.status()).toBe(404);
  expect((await request.get(`/img/e2e-${run}/no-existe.png`)).status()).toBe(404);
  expect((await request.get(`/img/..%2F..%2Fetc/passwd`)).status()).toBe(404);
});

test("[002-AC25] the public cannot read /panel/img", async ({ request }) => {
  const res = await request.get(`/panel/img/${draft.path}`, {
    maxRedirects: 0,
  });
  expect(res.status()).not.toBe(200);
  expect(res.headers()["content-type"] ?? "").not.toMatch(/^image\//);
});

test("[002-AC26] the signed-in admin reads an unpublished image at /panel/img, uncached", async ({
  page,
}) => {
  await signIn(page);
  const res = await page.request.get(`/panel/img/${draft.path}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(res.headers()["cache-control"]).toMatch(/private/);
  expect(res.headers()["cache-control"]).toMatch(/no-store/);

  // The public route still refuses the same file, with the admin's cookies.
  expect((await page.request.get(`/img/${draft.path}`)).status()).toBe(404);
});
