import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, Admin: products (criteria 6, 7 and 8) and the photo tools. Fake
// names and a generated 1x1 PNG only. Every test makes its own product with a
// name that carries the project and a run id (both viewports run at once on one
// database) and the products are removed afterwards.

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
  // Its own admin: the sign-out test of the sign-in spec would otherwise end
  // our sessions mid-test (signing out revokes every session of the user).
  const created = await createTestAdmin("products");
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
  // Whatever a failed test left behind: files first, then the rows.
  const { data } = await admin
    .from("product")
    .select("id, image(storage_path)")
    .like("name", `%e2e ${run}%`);
  for (const product of data ?? []) {
    const paths = (product.image as { storage_path: string }[]).map((i) => i.storage_path);
    if (paths.length) await admin.storage.from("images").remove(paths);
    await admin.from("product").delete().eq("id", product.id);
  }
  await removeAdmin();
});

function productName(label: string, project: string): string {
  return `Producto ${label} ${project} e2e ${run}`;
}

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

type NewProduct = {
  name: string;
  price?: string;
  kind?: "Producto" | "Pack";
  published?: boolean;
  available?: boolean;
};

// Creates a product through the form; lands on its edit page.
async function createProduct(page: Page, p: NewProduct) {
  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(p.name);
  if (p.price !== undefined) {
    await page.getByLabel("Precio desde (CLP)").fill(p.price);
  }
  if (p.kind) await page.getByLabel("Tipo", { exact: true }).selectOption({ label: p.kind });
  if (p.available === false) await page.getByLabel("Disponible", { exact: true }).uncheck();
  if (p.published) await page.getByLabel("Publicado", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function uploadPhoto(
  page: Page,
  alt: string,
  file: { name: string; mimeType: string; buffer: Buffer } = {
    name: "foto.png",
    mimeType: "image/png",
    buffer: PNG,
  },
) {
  await page.getByLabel("Archivo de imagen").setInputFiles(file);
  await page.getByLabel("Texto alternativo de la foto nueva").fill(alt);
  await page.getByRole("button", { name: "Subir foto", exact: true }).click();
}

async function saveChanges(page: Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function publicCard(page: Page, name: string) {
  await page.goto("/");
  return page.locator("article", { hasText: name });
}

test("[002-AC6] the admin creates a product with price, type and a photo with alt text, publishes it, and it shows on the public page", async ({
  page,
}, testInfo) => {
  const name = productName("nuevo", testInfo.project.name);
  const alt = `Botella de prueba azul ${run}`;
  await signIn(page);

  await createProduct(page, { name, price: "7.000", published: true });
  await uploadPhoto(page, alt);
  await expect(page.getByRole("status").filter({ hasText: "Foto subida." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  // The admin previews the private file through /panel/img.
  const preview = page.getByRole("img", { name: alt });
  await expect(preview).toHaveAttribute("src", /^\/panel\/img\/product\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
  await expect
    .poll(() => preview.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);

  // The list shows it as published and available, with the dot in the price.
  await page.goto("/panel/productos");
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row).toContainText("Publicado");
  await expect(row).toContainText("Disponible");
  await expect(row).toContainText("$7.000");

  // No deploy: the public page, read at request time, already has it.
  const card = await publicCard(page, name);
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(card).toContainText("desde $7.000");
  await expect(card.getByRole("img", { name: alt })).toHaveAttribute("src", /^\/img\/product\//);
  // In the section of its type: a new product is a "Producto".
  await expect(page.locator("#productos article", { hasText: name })).toBeVisible();
  await expect(page.locator("#packs article", { hasText: name })).toHaveCount(0);
});

test("[002-AC32] the form has a Tipo field, Producto or Pack, starting as Producto, and no Categoría; the list shows the type", async ({
  page,
}, testInfo) => {
  const name = productName("tipo-pack", testInfo.project.name);
  await signIn(page);
  await page.goto("/panel/productos/nuevo");

  const tipo = page.getByLabel("Tipo", { exact: true });
  await expect(tipo).toBeVisible();
  await expect(tipo).toHaveValue("producto");
  await expect(tipo.locator("option")).toHaveText(["Producto", "Pack"]);
  await expect(page.getByLabel("Categoría")).toHaveCount(0);
  await expect(page.getByText("Categoría")).toHaveCount(0);

  await createProduct(page, { name, kind: "Pack" });
  await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("pack");

  await page.goto("/panel/productos");
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Pack", { exact: true })).toBeVisible();
  await expect(row).not.toContainText("categoría");
  // The seeded products are "Producto".
  const seeded = page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" });
  await expect(seeded.getByText("Producto", { exact: true })).toBeVisible();
});

test("[002-AC36] changing a published product's type to Pack moves it to the Packs section, without a deploy", async ({
  page,
}, testInfo) => {
  const name = productName("a-pack", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name, price: "7.000", published: true });
  const edit = new URL(page.url()).pathname;

  await page.goto("/");
  await expect(page.locator("#productos article", { hasText: name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.locator("#packs article", { hasText: name })).toHaveCount(0);

  await page.goto(edit);
  await page.getByLabel("Tipo", { exact: true }).selectOption({ label: "Pack" });
  await saveChanges(page);
  await expect(page.getByLabel("Tipo", { exact: true })).toHaveValue("pack");

  await page.goto("/");
  await expect(page.locator("#packs article", { hasText: name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.locator("#productos article", { hasText: name })).toHaveCount(0);
});

test("[002-AC7] changing the price, marking it unavailable and unpublishing a published product make the public page follow", async ({
  page,
}, testInfo) => {
  const name = productName("cambios", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name, price: "7000", published: true });
  const edit = new URL(page.url()).pathname;

  const card = await publicCard(page, name);
  await expect(card).toContainText("desde $7.000", { timeout: PAGE_TIMEOUT });

  await page.goto(edit);
  await page.getByLabel("Precio desde (CLP)").fill("9.900");
  await saveChanges(page);
  await expect(page.getByLabel("Precio desde (CLP)")).toHaveValue("9.900");
  await expect(await publicCard(page, name)).toContainText("desde $9.900", {
    timeout: PAGE_TIMEOUT,
  });

  // An empty price is saved as no price: the public page shows none.
  await page.goto(edit);
  await page.getByLabel("Precio desde (CLP)").fill("");
  await saveChanges(page);
  const noPrice = await publicCard(page, name);
  await expect(noPrice).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(noPrice).not.toContainText("desde");

  await page.goto(edit);
  await page.getByLabel("Disponible", { exact: true }).uncheck();
  await saveChanges(page);
  const unavailable = await publicCard(page, name);
  await expect(unavailable).toContainText("no disponible por ahora", { timeout: PAGE_TIMEOUT });
  await expect(unavailable.getByRole("link")).toHaveCount(0);

  await page.goto(edit);
  await page.getByLabel("Publicado", { exact: true }).uncheck();
  await saveChanges(page);
  await page.goto("/");
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByText(name)).toHaveCount(0);
});

test("[002-AC7] deleting a published product removes it, its photos and its files", async ({
  page,
}, testInfo) => {
  const name = productName("borrar", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name, price: "5.500", published: true });
  const edit = new URL(page.url()).pathname;
  await uploadPhoto(page, "Foto para borrar");
  await expect(page.getByRole("status").filter({ hasText: "Foto subida." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const src = await page.getByRole("img", { name: "Foto para borrar" }).getAttribute("src");
  const storagePath = src!.replace("/panel/img/", "");
  expect((await page.request.get(`/panel/img/${storagePath}`)).status()).toBe(200);
  await expect(await publicCard(page, name)).toBeVisible({ timeout: PAGE_TIMEOUT });

  await page.goto(edit);
  await page.getByText("Eliminar producto", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar este producto" }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?aviso=eliminado$/, { timeout: PAGE_TIMEOUT });
  await expect(page.getByRole("status").filter({ hasText: "Producto eliminado." })).toBeVisible();
  await expect(page.getByRole("link", { name })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByText(name)).toHaveCount(0);

  // The file is gone from storage too, not only the row.
  expect((await page.request.get(`/panel/img/${storagePath}`)).status()).toBe(404);
  const { data } = await admin.storage.from("images").download(storagePath);
  expect(data).toBeNull();
});

test.describe("[002-AC8] photos the form refuses", () => {
  test("[002-AC8] a photo without alt text is refused with a clear message and is not saved", async ({
    page,
  }, testInfo) => {
    const name = productName("sinalt", testInfo.project.name);
    await signIn(page);
    await createProduct(page, { name, price: "1.000" });

    await page.getByLabel("Archivo de imagen").setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await page.getByRole("button", { name: "Subir foto", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "texto alternativo" })).toBeVisible();
    await expect(page.getByLabel("Texto alternativo de la foto nueva")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // Blank spaces are not text.
    await page.getByLabel("Texto alternativo de la foto nueva").fill("   ");
    await page.getByRole("button", { name: "Subir foto", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "texto alternativo" })).toBeVisible();

    await expect(page.getByRole("list", { name: "Fotos del producto" })).toHaveCount(0);
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });

  test("[002-AC8] a photo above 5 MB is refused with a clear message and is not saved", async ({
    page,
  }, testInfo) => {
    const name = productName("grande", testInfo.project.name);
    await signIn(page);
    await createProduct(page, { name, price: "1.000" });

    await uploadPhoto(page, "Una foto enorme", {
      name: "enorme.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole("alert").filter({ hasText: "más de 5 MB" })).toBeVisible();
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });

  test("[002-AC8] a file that is not a JPG, PNG, WebP or AVIF is refused with a clear message", async ({
    page,
  }, testInfo) => {
    const name = productName("tipo", testInfo.project.name);
    await signIn(page);
    await createProduct(page, { name, price: "1.000" });

    await uploadPhoto(page, "Un documento", {
      name: "documento.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "JPG, PNG, WebP o AVIF" })).toBeVisible();
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });
});

test("the admin edits alt text, reorders and deletes photos one at a time", async ({
  page,
}, testInfo) => {
  const name = productName("fotos", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name, price: "1.000", published: true });
  const edit = new URL(page.url()).pathname;

  for (const alt of ["Foto uno", "Foto dos", "Foto tres"]) {
    await uploadPhoto(page, alt);
    await expect(page.getByRole("img", { name: alt })).toBeVisible({ timeout: PAGE_TIMEOUT });
  }
  const alts = () =>
    page
      .getByRole("list", { name: "Fotos del producto" })
      .getByRole("img")
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt));
  expect(await alts()).toEqual(["Foto uno", "Foto dos", "Foto tres"]);

  await page.getByRole("button", { name: "Mover la foto 3 hacia arriba" }).click();
  await expect.poll(alts).toEqual(["Foto uno", "Foto tres", "Foto dos"]);
  // The first photo is the cover: the public card follows the new order.
  await page.getByRole("button", { name: "Mover la foto 2 hacia arriba" }).click();
  await expect.poll(alts).toEqual(["Foto tres", "Foto uno", "Foto dos"]);
  await expect(
    (await publicCard(page, name)).getByRole("img", { name: "Foto tres" }),
  ).toBeVisible({ timeout: PAGE_TIMEOUT });

  await page.goto(edit);
  await page.getByLabel("Texto alternativo de la foto 1").fill("Foto tres corregida");
  await page.getByLabel("Tipo de la foto 1").selectOption({ label: "Gráfico" });
  await page.getByRole("button", { name: "Guardar foto 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Foto guardada." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByLabel("Tipo de la foto 1")).toHaveValue("graphic");
  await expect.poll(alts).toEqual(["Foto tres corregida", "Foto uno", "Foto dos"]);

  // Saving with the alt text emptied is refused.
  await page.getByLabel("Texto alternativo de la foto 1").fill("");
  await page.getByRole("button", { name: "Guardar foto 1" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "texto alternativo" })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar la foto 2" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Foto eliminada." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect.poll(alts).toEqual(["Foto tres corregida", "Foto dos"]);
});

test("the form shows Spanish errors, keeps what was typed, and refuses a repeated address", async ({
  page,
}, testInfo) => {
  const name = productName("errores", testInfo.project.name);
  await signIn(page);
  await page.goto("/panel/productos/nuevo");

  // The address is generated from the name while typing, and stays editable.
  await page.getByLabel("Nombre", { exact: true }).fill("Taza Mágica Ñandú");
  await expect(page.getByLabel("Dirección web (slug)")).toHaveValue("taza-magica-nandu");

  await page.getByLabel("Nombre", { exact: true }).fill("");
  await page.getByLabel("Precio desde (CLP)").fill("7,5");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Escribe el nombre" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "precio" })).toBeVisible();
  await expect(page.getByLabel("Precio desde (CLP)")).toHaveValue("7,5");

  // A repeated address is refused with a message on the field.
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Precio desde (CLP)").fill("7.000");
  await page.getByLabel("Dirección web (slug)").fill("demo-botella-ejemplo");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ya hay un producto con esa dirección" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/productos\/nuevo/);

  // A badly written address is refused too.
  await page.getByLabel("Dirección web (slug)").fill("Dirección Mala!");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "minúsculas" })).toBeVisible();
});

test("the products screens are only for the admin", async ({ page }) => {
  for (const path of ["/panel/productos", "/panel/productos/nuevo"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar/);
  }
});

test("the products screens have no serious or critical accessibility violations and no horizontal scroll", async ({
  page,
}, testInfo) => {
  const name = productName("axe", testInfo.project.name);
  const check = async () => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  };
  const noHorizontalScroll = async () =>
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

  await signIn(page);
  expect(await check()).toEqual([]);

  await page.goto("/panel/productos");
  // The page title; the list's group heading "Productos" is an h2.
  await expect(page.getByRole("heading", { name: "Productos", level: 1 })).toBeVisible();
  expect(await check()).toEqual([]);
  await noHorizontalScroll();

  await page.goto("/panel/productos/nuevo");
  await expect(page.getByRole("heading", { name: "Nuevo producto" })).toBeVisible();
  expect(await check()).toEqual([]);
  await noHorizontalScroll();

  await createProduct(page, { name, price: "1.000", published: true });
  await uploadPhoto(page, "Foto para revisar");
  await expect(page.getByRole("img", { name: "Foto para revisar" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  expect(await check()).toEqual([]);
  await noHorizontalScroll();

  // With the errors showing, too.
  await page.getByRole("button", { name: "Subir foto", exact: true }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  expect(await check()).toEqual([]);

  await page.goto("/panel/productos");
  await expect(page.getByRole("link", { name })).toBeVisible();
  expect(await check()).toEqual([]);
});

// Spec 002, criteria 38 to 42 (amendment of 2026-10-31, issue #72): telling
// packs apart in the panel list. Other tests add products at the same time, so
// the checks compare the page with itself rather than with fixed numbers (the
// exact counting is unit tested in admin-product-list.test.ts).

const filters = (page: Page) => page.getByRole("navigation", { name: "Filtrar por tipo" });

function contrast(fg: string, bg: string): number {
  const lum = (rgb: string) => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

test("[002-AC38] each pack carries a Pack badge first in its badges, and no product does", async ({
  page,
}, testInfo) => {
  const pack = productName("badge-pack", testInfo.project.name);
  const producto = productName("badge-producto", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name: pack, kind: "Pack" });
  await createProduct(page, { name: producto });

  await page.goto("/panel/productos");
  const packRow = page.getByRole("listitem").filter({ hasText: pack });
  const badge = packRow.getByTestId("pack-badge");
  await expect(badge).toHaveText("Pack");
  // First in its row of badges, before "Sin publicar".
  const badgeTexts = await packRow.getByTestId("badges").locator("> *").allInnerTexts();
  expect(badgeTexts[0].trim()).toBe("Pack");
  expect(badgeTexts).toContain("Sin publicar");
  // The icon is decoration only.
  await expect(badge.locator("svg")).toHaveAttribute("aria-hidden", "true");
  const colors = await badge.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fg: s.color, bg: s.backgroundColor };
  });
  expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5);

  const productRow = page.getByRole("listitem").filter({ hasText: producto });
  await expect(productRow.getByTestId("pack-badge")).toHaveCount(0);
  // The seeded packs carry it too.
  await expect(
    page.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" }).getByTestId("pack-badge"),
  ).toBeVisible();
});

test("[002-AC39] the filters count every product and pack, published or not", async ({ page }) => {
  await signIn(page);
  await page.goto("/panel/productos");
  // The list streams in after the page shell: wait for it before reading.
  await expect(filters(page).getByRole("link")).toHaveCount(3);
  await expect(page.locator('[data-testid="product-group"]').first()).toBeVisible();
  const labels = await filters(page).getByRole("link").allInnerTexts();
  expect(labels.map((l) => l.replace(/\s*\(\d+\)$/, ""))).toEqual(["Todos", "Productos", "Packs"]);
  const [todos, productos, packs] = labels.map((l) => Number(l.match(/\((\d+)\)$/)?.[1]));
  // The seeded draft pack and draft product count too.
  expect(packs).toBeGreaterThanOrEqual(3);
  expect(todos).toBe(productos + packs);
  // Under Todos, every item shows once, in its group.
  const shown = await page.locator('[data-testid="product-group"] li').count();
  expect(shown).toBe(todos);
  const draftPack = page.getByRole("listitem").filter({ hasText: "Pack de ejemplo (borrador)" });
  await expect(draftPack).toBeVisible();
});

test("[002-AC40] choosing a filter lists only that type, keeps it in the address and after a reload", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/panel/productos");
  await filters(page).getByRole("link", { name: /^Packs/ }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?tipo=pack$/);
  await expect(page.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toHaveCount(0);
  // Every item listed is a pack.
  const rows = page.locator('[data-testid="product-group"] li');
  const total = await rows.count();
  expect(total).toBeGreaterThan(0);
  await expect(rows.getByTestId("pack-badge")).toHaveCount(total);

  await page.reload();
  await expect(filters(page).getByRole("link", { name: /^Packs/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toHaveCount(0);

  await filters(page).getByRole("link", { name: /^Productos/ }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?tipo=producto$/);
  await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toBeVisible();
  await expect(page.locator('[data-testid="product-group"]').getByTestId("pack-badge")).toHaveCount(0);

  // No tipo, or an unknown one, is Todos.
  for (const path of ["/panel/productos", "/panel/productos?tipo=bundle"]) {
    await page.goto(path);
    await expect(filters(page).getByRole("link", { name: /^Todos/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" })).toBeVisible();
  }
});

test("[002-AC41] under Todos the list is grouped under Productos and then Packs", async ({ page }) => {
  await signIn(page);
  await page.goto("/panel/productos");
  await expect(page.locator('[data-testid="product-group"]')).toHaveCount(2);
  const headings = await page
    .locator('[data-testid="product-group"]')
    .getByRole("heading", { level: 2 })
    .allInnerTexts();
  expect(headings).toEqual(["Productos", "Packs"]);
  const packGroup = page.locator('[data-testid="product-group"]').nth(1);
  await expect(packGroup.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" })).toBeVisible();
  await expect(packGroup.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toHaveCount(0);
  // A chosen type has no group heading.
  await page.goto("/panel/productos?tipo=pack");
  await expect(page.locator('[data-testid="product-group"]')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="product-group"]').getByRole("heading", { level: 2 }),
  ).toHaveCount(0);
});

test("[002-AC42] the filters work with the keyboard, mark the current one, and do not scroll sideways", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/panel/productos");
  const packs = filters(page).getByRole("link", { name: /^Packs/ });
  await packs.focus();
  const outline = await packs.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
  });
  expect(outline).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?tipo=pack$/);
  await expect(filters(page).getByRole("link", { name: /^Packs/ })).toHaveAttribute("aria-current", "page");
  await expect(filters(page).locator('[aria-current="page"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
});
