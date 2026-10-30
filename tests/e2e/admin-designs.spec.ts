import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, Admin: designs (criterion 9, and the photo rules of criterion 8 for
// designs). Fake titles and a generated 1x1 PNG only. Every test makes its own
// design with a title that carries the project and a run id (both viewports run
// at once on one database) and the designs are removed afterwards.

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
  // Its own admin, so another spec signing out does not end our sessions.
  const created = await createTestAdmin("designs");
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
    .from("design")
    .select("id, image(storage_path)")
    .like("title", `%e2e ${run}%`);
  for (const design of data ?? []) {
    const paths = (design.image as { storage_path: string }[]).map((i) => i.storage_path);
    if (paths.length) await admin.storage.from("images").remove(paths);
    await admin.from("design").delete().eq("id", design.id);
  }
  await removeAdmin();
});

function designTitle(label: string, project: string): string {
  return `Diseño ${label} ${project} e2e ${run}`;
}

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

type NewDesign = { title: string; description?: string; published?: boolean };

// Creates a design through the form; lands on its edit page.
async function createDesign(page: Page, d: NewDesign) {
  await page.goto("/panel/disenos/nuevo");
  await page.getByLabel("Título", { exact: true }).fill(d.title);
  if (d.description) await page.getByLabel("Descripción").fill(d.description);
  if (d.published) await page.getByLabel("Publicado", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar diseño" }).click();
  await expect(page.getByRole("heading", { name: "Editar diseño" })).toBeVisible({
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
  await expect(page.getByRole("status").filter({ hasText: "Diseño guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

async function publicDesign(page: Page, title: string) {
  await page.goto("/");
  return page.locator("#trabajos article", { hasText: title });
}

test("[002-AC9] the admin creates a design with a photo and alt text, publishes it, and the Real work section shows it without a deploy", async ({
  page,
}, testInfo) => {
  const title = designTitle("nuevo", testInfo.project.name);
  const alt = `Estrellas de prueba ${run}`;
  await signIn(page);

  // Saved but not published: the public page does not show it.
  await createDesign(page, { title, description: "Una descripción de prueba." });
  const edit = new URL(page.url()).pathname;
  await uploadPhoto(page, alt);
  await expect(page.getByRole("status").filter({ hasText: "Foto subida." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  // The admin previews the private file through /panel/img.
  const preview = page.getByRole("img", { name: alt });
  await expect(preview).toHaveAttribute(
    "src",
    /^\/panel\/img\/design\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/,
  );
  await expect
    .poll(() => preview.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
  await page.goto("/");
  await expect(page.getByText("Diseño de ejemplo: estrellas")).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByText(title)).toHaveCount(0);

  // The list shows it as not published.
  await page.goto("/panel/disenos");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toContainText(
    "Sin publicar",
  );

  // Publish it: no deploy, the public page already has it, with its photo.
  await page.goto(edit);
  await page.getByLabel("Publicado", { exact: true }).check();
  await saveChanges(page);
  await page.goto("/panel/disenos");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toContainText("Publicado");

  const card = await publicDesign(page, title);
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(card).toContainText("Una descripción de prueba.");
  await expect(card.getByRole("img", { name: alt })).toHaveAttribute("src", /^\/img\/design\//);
  await expect(page.getByRole("heading", { name: "Trabajos reales" })).toBeVisible();
});

test("[002-AC9] editing a design changes the Real work section, and unpublishing or deleting it removes it, with its photo files", async ({
  page,
}, testInfo) => {
  const title = designTitle("cambios", testInfo.project.name);
  const renamed = designTitle("renombrado", testInfo.project.name);
  await signIn(page);
  await createDesign(page, { title, description: "Antes", published: true });
  const edit = new URL(page.url()).pathname;
  await uploadPhoto(page, "Foto para borrar");
  await expect(page.getByRole("status").filter({ hasText: "Foto subida." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const src = await page.getByRole("img", { name: "Foto para borrar" }).getAttribute("src");
  const storagePath = src!.replace("/panel/img/", "");
  expect((await page.request.get(`/panel/img/${storagePath}`)).status()).toBe(200);
  await expect(await publicDesign(page, title)).toBeVisible({ timeout: PAGE_TIMEOUT });

  // Edit title and description: the section follows.
  await page.goto(edit);
  await page.getByLabel("Título", { exact: true }).fill(renamed);
  await page.getByLabel("Descripción").fill("Después");
  await saveChanges(page);
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(renamed);
  const card = await publicDesign(page, renamed);
  await expect(card).toContainText("Después", { timeout: PAGE_TIMEOUT });
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  // Unpublish: it disappears from the public page but stays in the panel.
  await page.goto(edit);
  await page.getByLabel("Publicado", { exact: true }).uncheck();
  await saveChanges(page);
  await page.goto("/");
  await expect(page.getByText("Diseño de ejemplo: estrellas")).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByText(renamed)).toHaveCount(0);
  await page.goto("/panel/disenos");
  await expect(page.getByRole("link", { name: renamed })).toBeVisible();

  // Delete: the design, its photo row and its file are gone.
  await page.goto(edit);
  await page.getByText("Eliminar diseño", { exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar este diseño" }).click();
  await expect(page).toHaveURL(/\/panel\/disenos\?aviso=diseno-eliminado$/, { timeout: PAGE_TIMEOUT });
  await expect(page.getByRole("status").filter({ hasText: "Diseño eliminado." })).toBeVisible();
  await expect(page.getByRole("link", { name: renamed })).toHaveCount(0);
  expect((await page.request.get(`/panel/img/${storagePath}`)).status()).toBe(404);
  const { data } = await admin.storage.from("images").download(storagePath);
  expect(data).toBeNull();
});

test.describe("[002-AC8] design photos the form refuses", () => {
  test("[002-AC8] a design photo without alt text is refused with a clear message and is not saved", async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await createDesign(page, { title: designTitle("sinalt", testInfo.project.name) });

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

    await expect(page.getByRole("list", { name: "Fotos del diseño" })).toHaveCount(0);
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });

  test("[002-AC8] a design photo above 5 MB is refused with a clear message and is not saved", async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await createDesign(page, { title: designTitle("grande", testInfo.project.name) });

    await uploadPhoto(page, "Una foto enorme", {
      name: "enorme.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(page.getByRole("alert").filter({ hasText: "más de 5 MB" })).toBeVisible();
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });

  test("[002-AC8] a design file that is not a JPG, PNG, WebP or AVIF is refused with a clear message", async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await createDesign(page, { title: designTitle("tipo", testInfo.project.name) });

    await uploadPhoto(page, "Un documento", {
      name: "documento.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "JPG, PNG, WebP o AVIF" })).toBeVisible();
    await expect(page.getByText("Todavía no hay fotos.")).toBeVisible();
  });
});

test("the admin edits alt text, reorders and deletes the photos of a design one at a time", async ({
  page,
}, testInfo) => {
  const title = designTitle("fotos", testInfo.project.name);
  await signIn(page);
  await createDesign(page, { title, published: true });
  const edit = new URL(page.url()).pathname;

  for (const alt of ["Foto uno", "Foto dos", "Foto tres"]) {
    await uploadPhoto(page, alt);
    await expect(page.getByRole("img", { name: alt })).toBeVisible({ timeout: PAGE_TIMEOUT });
  }
  const alts = () =>
    page
      .getByRole("list", { name: "Fotos del diseño" })
      .getByRole("img")
      .evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt));
  expect(await alts()).toEqual(["Foto uno", "Foto dos", "Foto tres"]);

  await page.getByRole("button", { name: "Mover la foto 3 hacia arriba" }).click();
  await expect.poll(alts).toEqual(["Foto uno", "Foto tres", "Foto dos"]);
  await page.getByRole("button", { name: "Mover la foto 2 hacia arriba" }).click();
  await expect.poll(alts).toEqual(["Foto tres", "Foto uno", "Foto dos"]);
  // The public gallery follows the order.
  const card = await publicDesign(page, title);
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect
    .poll(() =>
      card.getByRole("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).alt)),
    )
    .toEqual(["Foto tres", "Foto uno", "Foto dos"]);

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

test("the design form shows Spanish errors, keeps what was typed, and refuses a repeated address", async ({
  page,
}, testInfo) => {
  const title = designTitle("errores", testInfo.project.name);
  await signIn(page);
  await page.goto("/panel/disenos/nuevo");

  // The address is generated from the title while typing, and stays editable.
  await page.getByLabel("Título", { exact: true }).fill("Taza Mágica Ñandú");
  await expect(page.getByLabel("Dirección web (slug)")).toHaveValue("taza-magica-nandu");

  await page.getByLabel("Título", { exact: true }).fill("");
  await page.getByLabel("Descripción").fill("Lo que escribí");
  await page.getByRole("button", { name: "Guardar diseño" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Escribe el título" })).toBeVisible();
  await expect(page.getByLabel("Descripción")).toHaveValue("Lo que escribí");

  // A repeated address is refused with a message on the field.
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Dirección web (slug)").fill("demo-diseno-estrellas");
  await page.getByRole("button", { name: "Guardar diseño" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ya hay un diseño con esa dirección" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/disenos\/nuevo/);

  // A badly written address is refused too.
  await page.getByLabel("Dirección web (slug)").fill("Dirección Mala!");
  await page.getByRole("button", { name: "Guardar diseño" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "minúsculas" })).toBeVisible();
});

test("the panel header has a Diseños entry that opens the designs list", async ({ page }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Diseños" }).click();
  await expect(page).toHaveURL(/\/panel\/disenos$/);
  await expect(page.getByRole("heading", { name: "Diseños", exact: true })).toBeVisible();
});

test("the designs screens are only for the admin", async ({ page }) => {
  for (const path of ["/panel/disenos", "/panel/disenos/nuevo"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/entrar/);
  }
});

test("the designs screens have no serious or critical accessibility violations and no horizontal scroll", async ({
  page,
}, testInfo) => {
  const title = designTitle("axe", testInfo.project.name);
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

  await page.goto("/panel/disenos");
  await expect(page.getByRole("heading", { name: "Diseños", exact: true })).toBeVisible();
  expect(await check()).toEqual([]);
  await noHorizontalScroll();

  await page.goto("/panel/disenos/nuevo");
  await expect(page.getByRole("heading", { name: "Nuevo diseño" })).toBeVisible();
  expect(await check()).toEqual([]);
  await noHorizontalScroll();

  await createDesign(page, { title, published: true });
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

  await page.goto("/panel/disenos");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  expect(await check()).toEqual([]);
  await noHorizontalScroll();
});
