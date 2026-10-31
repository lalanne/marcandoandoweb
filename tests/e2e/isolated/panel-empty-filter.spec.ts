import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "../supabase";

// Spec 002, criterion 41: a chosen type with no items says so. It turns every
// pack into a product for a moment, so it runs in tests/e2e/isolated/, after
// every other test (see playwright.config.ts), and puts them back at the end.

let ADMIN: { email: string; password: string };
let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("empty-filter");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.signInWithPassword(created);
  if (error) throw new Error(error.message);
});

test.afterAll(async () => {
  await removeAdmin();
});

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("[002-AC41] with no packs, the Packs filter says so in Spanish and Todos has no Packs heading", async ({
  page,
}) => {
  const { data, error } = await admin
    .from("product")
    .update({ kind: "producto" })
    .eq("kind", "pack")
    .select("id");
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((r) => r.id as string);
  expect(ids.length).toBeGreaterThan(0);
  try {
    await signIn(page);
    await page.goto("/panel/productos?tipo=pack");
    await expect(page.getByText("Todavía no hay packs.")).toBeVisible();
    await expect(page.locator('[data-testid="product-group"] li')).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Filtrar por tipo" }).getByRole("link", { name: "Packs (0)" }),
    ).toBeVisible();

    await page.goto("/panel/productos");
    await expect(page.locator('[data-testid="product-group"]')).toHaveCount(1);
    const headings = await page
      .locator('[data-testid="product-group"]')
      .getByRole("heading", { level: 2 })
      .allInnerTexts();
    expect(headings).toEqual(["Productos"]);
  } finally {
    const { error: restore } = await admin.from("product").update({ kind: "pack" }).in("id", ids);
    if (restore) throw new Error(restore.message);
  }
});
