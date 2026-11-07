import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, 2026-11-06 amendment (issues #136 and #138), criterion 98: the pages
// are served from a cache, and every panel action that changes the public view
// refreshes it, so the next load of each affected page shows the change. The
// criterion 97 case (a change made directly in the database does not show) lives
// in isolated/catalog-cache.spec.ts, because it needs no other test to refresh the
// cache while it runs. The admin makes its own product, named with the project
// and a run id (both viewports run at once on one database).

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PAGE_TIMEOUT = 20_000;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("catalog-cache");
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
  const { data } = await admin
    .from("product")
    .select("id, image(storage_path)")
    .like("name", `%cache e2e ${run}%`);
  for (const product of data ?? []) {
    const paths = (product.image as { storage_path: string }[]).map((i) => i.storage_path);
    if (paths.length) await admin.storage.from("images").remove(paths);
    await admin.from("product").delete().eq("id", product.id);
  }
  await removeAdmin();
});

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

async function save(page: Page, button: "Guardar cambios" | "Guardar producto" = "Guardar cambios") {
  await page.getByRole("button", { name: button }).click();
  if (button === "Guardar cambios") {
    await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  } else {
    await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
  }
}

// The card of `name` on a public page, or an empty locator when it is not there.
// Waits for the page's own content first, so "not there" is not "not loaded yet".
async function card(page: Page, path: string, name: string) {
  await page.goto(path);
  await expect(page.locator("#productos article, #packs article").first()).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  return page.locator("article", { hasText: name });
}

const HOME = "/";
const NAVIDAD = "/?coleccion=navidad";
const EMPRESAS = "/empresas";

test("[002-AC98] every panel action that changes the public view shows on the next load of the home page, its collection view and /empresas", async ({
  page,
}, testInfo) => {
  const name = `Producto ${testInfo.project.name} cache e2e ${run}`;
  const renamed = `Renombrado ${testInfo.project.name} cache e2e ${run}`;
  await signIn(page);

  // Create, published, in Especial Navidad, with a price.
  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Precio (CLP)").fill("7.000");
  await page.getByLabel("Publicado", { exact: true }).check();
  await page.getByRole("group", { name: "Colecciones" }).getByRole("checkbox", { name: "Especial Navidad" }).check();
  await save(page, "Guardar producto");
  const edit = new URL(page.url()).pathname;
  await expect(await card(page, HOME, name)).toBeVisible();
  await expect(await card(page, NAVIDAD, name)).toBeVisible();
  await expect(await card(page, EMPRESAS, name)).toHaveCount(0);

  // Rename.
  await page.goto(edit);
  await page.getByLabel("Nombre", { exact: true }).fill(renamed);
  await save(page);
  for (const path of [HOME, NAVIDAD]) {
    await expect(await card(page, path, renamed), path).toBeVisible();
    await expect(await card(page, path, name), path).toHaveCount(0);
  }

  // Price.
  await page.goto(edit);
  await page.getByLabel("Precio (CLP)").fill("9.900");
  await save(page);
  for (const path of [HOME, NAVIDAD]) {
    await expect(await card(page, path, renamed), path).toContainText("$9.900");
  }

  // Unavailable.
  await page.goto(edit);
  await page.getByLabel("Disponible", { exact: true }).uncheck();
  await save(page);
  for (const path of [HOME, NAVIDAD]) {
    await expect(await card(page, path, renamed), path).toContainText("no disponible por ahora");
  }
  await page.goto(edit);
  await page.getByLabel("Disponible", { exact: true }).check();
  await save(page);

  // A photo: add, change its text, remove.
  await page.getByLabel("Archivo de imagen").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByLabel("Texto alternativo de la foto nueva").fill(`Foto uno ${run}`);
  await page.getByRole("button", { name: "Subir foto", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Foto subida." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await page.getByLabel("Archivo de imagen").setInputFiles({
    name: "foto2.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByLabel("Texto alternativo de la foto nueva").fill(`Foto dos ${run}`);
  await page.getByRole("button", { name: "Subir foto", exact: true }).click();
  await expect(page.getByRole("img", { name: `Foto dos ${run}` })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  for (const path of [HOME, NAVIDAD]) {
    await expect(
      (await card(page, path, renamed)).getByRole("img", { name: `Foto uno ${run}` }),
      path,
    ).toBeVisible();
  }
  await page.goto(edit);
  await page.getByRole("button", { name: "Mover la foto 2 hacia arriba" }).click();
  await expect(page.getByRole("list", { name: "Fotos del producto" }).getByRole("img").first()).toHaveAttribute(
    "alt",
    `Foto dos ${run}`,
  );
  await expect(
    (await card(page, HOME, renamed)).getByRole("img", { name: `Foto dos ${run}` }),
  ).toBeVisible();
  await page.goto(edit);
  await page.getByLabel("Texto alternativo de la foto 1").fill(`Foto dos corregida ${run}`);
  await page.getByRole("button", { name: "Guardar foto 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Foto guardada." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(
    (await card(page, HOME, renamed)).getByRole("img", { name: `Foto dos corregida ${run}` }),
  ).toBeVisible();
  await page.goto(edit);
  await page.getByRole("button", { name: "Eliminar la foto 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Foto eliminada." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(
    (await card(page, HOME, renamed)).getByRole("img", { name: `Foto dos corregida ${run}` }),
  ).toHaveCount(0);

  // Collections: out of Especial Navidad, still in Todos.
  await page.goto(edit);
  await page.getByRole("group", { name: "Colecciones" }).getByRole("checkbox", { name: "Especial Navidad" }).uncheck();
  await save(page);
  await expect(await card(page, NAVIDAD, renamed)).toHaveCount(0);
  await expect(await card(page, HOME, renamed)).toBeVisible();

  // Unpublish and publish.
  await page.goto(edit);
  await page.getByLabel("Publicado", { exact: true }).uncheck();
  await save(page);
  await expect(await card(page, HOME, renamed)).toHaveCount(0);
  await page.goto(edit);
  await page.getByLabel("Publicado", { exact: true }).check();
  await save(page);
  await expect(await card(page, HOME, renamed)).toBeVisible();

  // Audience: Empresas moves it from the home page to /empresas.
  await page.goto(edit);
  await page.getByRole("group", { name: "Catálogo" }).getByRole("radio", { name: "Empresas" }).check();
  await save(page);
  await expect(await card(page, HOME, renamed)).toHaveCount(0);
  await expect(await card(page, EMPRESAS, renamed)).toBeVisible();

  // Delete.
  await page.goto(edit);
  await page.getByText("Eliminar producto", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar este producto" }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?aviso=eliminado$/, { timeout: PAGE_TIMEOUT });
  await expect(await card(page, EMPRESAS, renamed)).toHaveCount(0);
});
