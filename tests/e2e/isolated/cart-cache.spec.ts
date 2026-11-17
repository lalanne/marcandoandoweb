import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 006, criterion 23: /carrito reads the catalog from the same cache as the
// rest of the site. A name changed directly in the database does not show on the
// cart page until a save in the panel refreshes the cache. It lives in
// tests/e2e/isolated/ because any other test's save would refresh the cache early
// (see playwright.config.ts).

const PAGE_TIMEOUT = 20_000;
const STORAGE_KEY = "marcandoando-cart";
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;
let productId: string | null = null;

test.beforeAll(async () => {
  const created = await createTestAdmin("cart-cache");
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
  if (productId) await admin.from("product").delete().eq("id", productId);
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

test("[006-AC23] a name changed directly in the database does not show on /carrito that was already loaded; a save in the panel brings it in", async ({
  page,
}, testInfo) => {
  const slug = `e2e-cart-cache-${testInfo.project.name}-${run}`;
  const before = `Antes cart ${testInfo.project.name} ${run}`;
  const after = `Despues cart ${testInfo.project.name} ${run}`;
  const { data, error } = await admin
    .from("product")
    .insert({
      slug,
      name: before,
      kind: "producto",
      audience: "personas",
      price_from_clp: 5000,
      is_published: true,
      is_available: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  productId = data.id;
  await refreshCatalog(ADMIN);

  const stored = JSON.stringify({
    version: 1,
    items: [{ slug, color: null, size: null, quantity: 1, personalization: "" }],
    sent: false,
  });
  await page.goto("/carrito");
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, stored]);
  const name = (n: string) => page.getByRole("link", { name: n, exact: true });
  await page.reload();
  await expect(name(before)).toBeVisible({ timeout: PAGE_TIMEOUT });

  const update = await admin.from("product").update({ name: after }).eq("id", productId);
  if (update.error) throw new Error(update.error.message);

  // The database says the new name; the cached page still says the old one.
  await page.reload();
  await expect(name(before)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(name(after)).toHaveCount(0);

  // A save in the panel (criterion 98) is what brings it in.
  await refreshCatalog(ADMIN);
  await page.reload();
  await expect(name(after)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(name(before)).toHaveCount(0);
});
