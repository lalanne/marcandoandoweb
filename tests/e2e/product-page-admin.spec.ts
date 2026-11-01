import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, the admin side of a page per product: "Copiar enlace" in the list
// (criterion 63), the colors, sizes and characteristics fields (criterion 64) and
// the link surviving edits (criterion 66). Fake names only, removed afterwards.

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PAGE_TIMEOUT = 20_000;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("pagina-admin");
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
  await admin.from("product").delete().like("name", `%pagina-admin ${run}%`);
  await removeAdmin();
});

const productName = (label: string, project: string) =>
  `Producto ${label} ${project} pagina-admin ${run}`;

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

async function seed(name: string, extra: Record<string, unknown> = {}) {
  const slug = `e2e-${run}-${name.length}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await admin
    .from("product")
    .insert({ slug, name, is_published: true, ...extra })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; slug: string };
}

test("[002-AC63] a published product's row has 'Copiar enlace'; an unpublished one has none", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const published = productName("publicado", testInfo.project.name);
  const hidden = productName("borrador", testInfo.project.name);
  const { slug } = await seed(published);
  await seed(hidden, { is_published: false });
  await signIn(page);

  await page.goto("/panel/productos");
  const row = page.getByRole("listitem").filter({ hasText: published });
  const hiddenRow = page.getByRole("listitem").filter({ hasText: hidden });
  await expect(row).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(hiddenRow).toBeVisible();
  await expect(hiddenRow.getByRole("button", { name: /Copiar enlace/ })).toHaveCount(0);

  // Copy works (a stubbed clipboard so it runs at both widths) and announces it.
  await page.evaluate(() => {
    (window as unknown as { __copied: string }).__copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __copied: string }).__copied = text;
        },
      },
    });
  });
  void context;
  await row.getByRole("button", { name: /Copiar enlace/ }).click();
  await expect(row.getByRole("status")).toHaveText("Enlace copiado");
  expect(await page.evaluate(() => (window as unknown as { __copied: string }).__copied)).toBe(
    `${baseURL}/productos/${slug}`,
  );

  // And when the browser refuses, the link shows in a text field.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
  });
  await row.getByRole("button", { name: /Copiar enlace/ }).click();
  await expect(row.getByRole("textbox", { name: /Copia este enlace/ })).toHaveValue(
    `${baseURL}/productos/${slug}`,
  );
});

test("[002-AC64] the admin adds colors, sizes and characteristics, they show in order on the public page, and a removed color disappears", async ({
  page,
}, testInfo) => {
  const name = productName("detalles", testInfo.project.name);
  await signIn(page);

  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Publicado", { exact: true }).check();

  // Everything is optional: no colors, sizes or characteristics rows yet.
  await expect(page.getByLabel("Nombre del color 1")).toHaveCount(0);

  await page.getByRole("button", { name: "Agregar color" }).click();
  await page.getByLabel("Nombre del color 1").fill("Rosado");
  await page.getByLabel("Color 1", { exact: true }).fill("#e8647f");
  await page.getByRole("button", { name: "Agregar color" }).click();
  await page.getByLabel("Nombre del color 2").fill("Celeste");
  await page.getByLabel("Color 2", { exact: true }).fill("#4fb0b0");

  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByLabel("Tamaño o talla 1", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByLabel("Tamaño o talla 2", { exact: true }).fill("6");

  await page.getByLabel("Características").fill("100% algodón\nEstampado con vinilo");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });

  // The form shows what was stored.
  await expect(page.getByLabel("Nombre del color 1")).toHaveValue("Rosado");
  await expect(page.getByLabel("Nombre del color 2")).toHaveValue("Celeste");
  await expect(page.getByLabel("Tamaño o talla 2", { exact: true })).toHaveValue("6");

  const { data } = await admin.from("product").select("slug").eq("name", name).single();
  const slug = data!.slug as string;

  // No deploy: the public page already has them, in order.
  await page.goto(`/productos/${slug}`);
  const main = page.getByRole("main");
  await expect(main.getByRole("region", { name: "Colores" }).getByRole("listitem")).toHaveText(
    ["Rosado", "Celeste"],
    { timeout: PAGE_TIMEOUT },
  );
  await expect(main.getByRole("region", { name: "Tamaños y tallas" }).getByRole("listitem")).toHaveText(["4", "6"]);
  await expect(main.getByRole("region", { name: "Características" }).getByRole("listitem")).toHaveText([
    "100% algodón",
    "Estampado con vinilo",
  ]);

  // Remove a color and save: it disappears.
  await page.goBack();
  await page.goto(`/panel/productos`);
  await page.getByRole("link", { name }).click();
  await page.getByRole("button", { name: "Quitar color 1" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await page.goto(`/productos/${slug}`);
  await expect(main.getByRole("region", { name: "Colores" }).getByRole("listitem")).toHaveText(["Celeste"], {
    timeout: PAGE_TIMEOUT,
  });
});

test("[002-AC64] a color with no name, or a 21st row, shows a Spanish error and saves nothing", async ({
  page,
}, testInfo) => {
  const name = productName("errores", testInfo.project.name);
  await signIn(page);

  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Agregar color" }).click();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /nombre del color 1/i })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  // The typed rows are kept and nothing was saved.
  await expect(page.getByLabel("Nombre del color 1")).toBeVisible();
  expect((await admin.from("product").select("id").eq("name", name)).data).toEqual([]);

  // A 21st row.
  await page.getByLabel("Nombre del color 1").fill("Uno");
  for (let i = 2; i <= 21; i += 1) {
    await page.getByRole("button", { name: "Agregar color" }).click();
    await page.getByLabel(`Nombre del color ${i}`).fill(`Color ${i}`);
  }
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /hasta 20 colores/i })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  expect((await admin.from("product").select("id").eq("name", name)).data).toEqual([]);

  // An empty size row is refused too.
  await page.reload();
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /tamaño o la talla 1/i })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  expect((await admin.from("product").select("id").eq("name", name)).data).toEqual([]);

  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("[002-AC66] a link already shared still opens the product after the name, price, colors, sizes and characteristics change", async ({
  page,
}, testInfo) => {
  const name = productName("enlace", testInfo.project.name);
  const { id, slug } = await seed(name, { price_from_clp: 5000 });
  await signIn(page);

  await page.goto(`/panel/productos/${id}`);
  await page.getByLabel("Nombre", { exact: true }).fill(`${name} renombrado`);
  await page.getByLabel("Precio (CLP)").fill("9.900");
  await page.getByRole("button", { name: "Agregar color" }).click();
  await page.getByLabel("Nombre del color 1").fill("Amarillo");
  await page.getByLabel("Características").fill("Nueva característica");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });

  await page.goto(`/productos/${slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: `${name} renombrado` }),
  ).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(page.getByText("$9.900 c/u")).toBeVisible();
  await expect(page.getByText("Amarillo")).toBeVisible();
});
