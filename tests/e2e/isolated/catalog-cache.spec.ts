import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-06 amendment (issues #136 and #138), criterion 97: the home
// page, its collection view and /empresas are served from a cache. A name changed
// directly in the database (not through the panel) does not show on a page that was
// already loaded. It lives in tests/e2e/isolated/ because any other test's save in
// the panel refreshes the cache and would show the change early (see
// playwright.config.ts). The `x-vercel-cache` half of the criterion needs Vercel
// and is read by the smoke test of spec 004 on production, not here.

const PAGE_TIMEOUT = 20_000;
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];

test.beforeAll(async () => {
  const created = await createTestAdmin("catalog-cache-97");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.signInWithPassword(ADMIN);
  if (error) throw new Error(error.message);
});

test.afterAll(async () => {
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
  // Leave the cache as the database is, for whatever runs next.
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

async function insert(row: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from("product").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  productIds.push(data.id);
  return data.id;
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("#productos article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
}

test("[002-AC97] a name changed directly in the database does not show on /, /?coleccion=navidad or /empresas that were already loaded", async ({
  page,
}, testInfo) => {
  const tag = `${testInfo.project.name} cache97 e2e ${run}`;
  const before = { personas: `Antes personas ${tag}`, empresas: `Antes empresas ${tag}` };
  const after = { personas: `Despues personas ${tag}`, empresas: `Despues empresas ${tag}` };
  const personasId = await insert({
    slug: `e2e-cache97-p-${testInfo.project.name}-${run}`,
    name: before.personas,
    kind: "producto",
    audience: "personas",
    collections: ["navidad"],
    is_published: true,
    is_available: true,
  });
  const empresasId = await insert({
    slug: `e2e-cache97-e-${testInfo.project.name}-${run}`,
    name: before.empresas,
    kind: "producto",
    audience: "empresas",
    is_published: true,
    is_available: true,
  });
  await refreshCatalog(ADMIN);

  const pages: [string, string, string][] = [
    ["/", before.personas, after.personas],
    ["/?coleccion=navidad", before.personas, after.personas],
    ["/empresas", before.empresas, after.empresas],
  ];
  for (const [path, old] of pages) {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 3, name: old, exact: true }), path).toBeVisible();
  }

  for (const [id, name] of [
    [personasId, after.personas],
    [empresasId, after.empresas],
  ]) {
    const { error } = await admin.from("product").update({ name }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  // The database says the new names; the cached pages still say the old ones.
  for (const [path, old, changed] of pages) {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 3, name: old, exact: true }), path).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: changed, exact: true }), path).toHaveCount(0);
  }

  // A save in the panel (criterion 98) is what brings them in.
  await refreshCatalog(ADMIN);
  for (const [path, old, changed] of pages) {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 3, name: changed, exact: true }), path).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: old, exact: true }), path).toHaveCount(0);
  }
});

test("[002-AC97] a name changed directly in the database does not show on a published product's page that was already loaded", async ({
  page,
}, testInfo) => {
  const tag = `${testInfo.project.name} cache97 page e2e ${run}`;
  const slug = `e2e-cache97-page-${testInfo.project.name}-${run}`;
  const id = await insert({
    slug,
    name: `Antes ${tag}`,
    kind: "producto",
    audience: "personas",
    is_published: true,
    is_available: true,
  });
  await refreshCatalog(ADMIN);

  const h1 = (name: string) => page.getByRole("heading", { level: 1, name, exact: true });
  await page.goto(`/productos/${slug}`);
  await expect(h1(`Antes ${tag}`)).toBeVisible({ timeout: PAGE_TIMEOUT });

  const { error } = await admin.from("product").update({ name: `Despues ${tag}` }).eq("id", id);
  if (error) throw new Error(error.message);

  // The database says the new name; the cached page still says the old one.
  await page.goto(`/productos/${slug}`);
  await expect(h1(`Antes ${tag}`)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(h1(`Despues ${tag}`)).toHaveCount(0);

  // A save in the panel (criterion 98) is what brings it in.
  await refreshCatalog(ADMIN);
  await page.goto(`/productos/${slug}`);
  await expect(h1(`Despues ${tag}`)).toBeVisible({ timeout: PAGE_TIMEOUT });
});
