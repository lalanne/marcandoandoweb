import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-19 amendment (issue #174), criterion 125: /?coleccion=casual is
// served from the catalog cache like the other views (criteria 97 and 98). A Casual
// item changed directly in the database does not show once the view was loaded; a
// save in the panel with "Casual" checked does. Isolated for the reason of
// isolated/catalog-cache.spec.ts: any other save would refresh the cache early.

const PAGE_TIMEOUT = 20_000;
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("casual-cache");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.signInWithPassword(ADMIN);
  if (error) throw new Error(error.message);
});

test.afterAll(async () => {
  await admin.from("product").delete().like("name", `%casual cache e2e ${run}%`);
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("#productos article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
}
const heading = (page: Page, name: string) =>
  page.getByRole("heading", { level: 3, name, exact: true });

test("[002-AC125] /?coleccion=casual does not show a Casual item changed directly in the database, and shows the item a save in the panel puts in Casual", async ({
  page,
}, testInfo) => {
  const tag = `${testInfo.project.name} casual cache e2e ${run}`;
  const before = `Antes ${tag}`;
  const after = `Despues ${tag}`;
  const saved = `Guardado ${tag}`;
  const { data, error } = await admin
    .from("product")
    .insert({
      slug: `e2e-casual-cache-${testInfo.project.name}-${run}`,
      name: before,
      kind: "producto",
      audience: "personas",
      collections: ["casual"],
      is_published: true,
      is_available: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await refreshCatalog(ADMIN);

  await open(page, "/?coleccion=casual");
  await expect(heading(page, before)).toBeVisible();

  const update = await admin.from("product").update({ name: after }).eq("id", data.id);
  if (update.error) throw new Error(update.error.message);

  // The database says the new name; the cached view still says the old one.
  await open(page, "/?coleccion=casual");
  await expect(heading(page, before)).toBeVisible();
  await expect(heading(page, after)).toHaveCount(0);

  // The admin saves a published Personas item with Casual checked in the panel.
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(saved);
  await page.getByLabel("Publicado", { exact: true }).check();
  await page
    .getByRole("group", { name: "Colecciones" })
    .getByRole("checkbox", { name: "Casual" })
    .check();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });

  await open(page, "/?coleccion=casual");
  await expect(heading(page, saved)).toBeVisible();
  await expect(heading(page, after)).toBeVisible();
  await expect(heading(page, before)).toHaveCount(0);
});
