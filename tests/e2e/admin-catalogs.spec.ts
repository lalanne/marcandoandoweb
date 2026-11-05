import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, "Catálogo empresa" in the panel (criteria 78 to 81, issue #107):
// the "Catálogo" field, the Empresas badge and the catalog filters. Every test
// makes its own products, named with the project and a run id (both viewports
// run at once on one database); they are removed afterwards.

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PAGE_TIMEOUT = 20_000;

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;

test.beforeAll(async () => {
  const created = await createTestAdmin("catalogs");
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
  await admin.from("product").delete().like("name", `%e2e ${run}%`);
  await removeAdmin();
});

const productName = (label: string, project: string) => `Catálogo ${label} ${project} e2e ${run}`;

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

const catalogGroup = (page: Page) => page.getByRole("group", { name: "Catálogo" });
const catalogFilters = (page: Page) =>
  page.getByRole("navigation", { name: "Filtrar por catálogo" });
const typeFilters = (page: Page) => page.getByRole("navigation", { name: "Filtrar por tipo" });

async function createProduct(
  page: Page,
  p: { name: string; audience?: "Personas" | "Empresas"; kind?: "Producto" | "Pack"; published?: boolean; price?: string },
) {
  await page.goto("/panel/productos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(p.name);
  if (p.price) await page.getByLabel("Precio (CLP)").fill(p.price);
  if (p.kind) await page.getByLabel("Tipo", { exact: true }).selectOption({ label: p.kind });
  if (p.audience) await catalogGroup(page).getByRole("radio", { name: p.audience }).check();
  if (p.published) await page.getByLabel("Publicado", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

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

const countOf = (label: string) => Number(label.match(/\((\d+)\)$/)?.[1]);

test("[002-AC78] the form has a required Catálogo field with Personas and Empresas, Personas first, and the price hint only for Empresas", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/panel/productos/nuevo");
  const group = catalogGroup(page);
  await expect(group).toBeVisible();
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(2);
  await expect(group.getByRole("radio", { name: "Personas" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "Empresas" })).not.toBeChecked();
  await expect(group.getByRole("radio").first()).toHaveAccessibleName("Personas");
  const hint = page.getByText("En Catálogo empresa no se muestra el precio.");
  await expect(hint).toHaveCount(0);
  await group.getByRole("radio", { name: "Empresas" }).check();
  await expect(hint).toBeVisible();
  await group.getByRole("radio", { name: "Personas" }).check();
  await expect(hint).toHaveCount(0);
  // Each radio is a target of at least 44 px.
  for (const radio of await radios.all()) {
    const box = await radio.locator("xpath=ancestor::label").boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("[002-AC78] saving a published item as Empresas moves it from the home page to /empresas, and back", async ({
  page,
}, testInfo) => {
  const name = productName("mueve", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name, kind: "Pack", published: true, price: "7.000" });
  const onHome = async () => {
    await page.goto("/");
    await expect(page.locator("#packs article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    return page.locator("article", { hasText: name });
  };
  const onEmpresas = async () => {
    await page.goto("/empresas");
    await expect(page.locator("#productos article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
    return page.locator("#packs article", { hasText: name });
  };
  const edit = page.url();
  await expect(await onHome()).toBeVisible();

  await page.goto(edit);
  await catalogGroup(page).getByRole("radio", { name: "Empresas" }).check();
  await expect(page.getByText("En Catálogo empresa no se muestra el precio.")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(catalogGroup(page).getByRole("radio", { name: "Empresas" })).toBeChecked();

  // No deploy: both pages read the database at request time.
  await expect(await onEmpresas()).toBeVisible();
  await expect(await onEmpresas()).not.toContainText("$7.000");
  await expect(await onHome()).toHaveCount(0);

  await page.goto(edit);
  await catalogGroup(page).getByRole("radio", { name: "Personas" }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(await onHome()).toBeVisible();
  await expect(await onEmpresas()).toHaveCount(0);
});

test("[002-AC79] an Empresas item carries an Empresas badge after Pack, a Personas item none, and the catalog filters count them", async ({
  page,
}, testInfo) => {
  const companyPack = productName("badge-pack", testInfo.project.name);
  const companyProduct = productName("badge-producto", testInfo.project.name);
  const person = productName("badge-persona", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name: companyPack, audience: "Empresas", kind: "Pack" });
  await createProduct(page, { name: companyProduct, audience: "Empresas" });
  await createProduct(page, { name: person });

  await page.goto("/panel/productos");
  await expect(catalogFilters(page).getByRole("link")).toHaveCount(3, { timeout: PAGE_TIMEOUT });
  await expect(page.locator('[data-testid="product-group"]').first()).toBeVisible();

  const packRow = page.getByRole("listitem").filter({ hasText: companyPack });
  const badge = packRow.getByTestId("empresas-badge");
  await expect(badge).toHaveText("Empresas");
  const badges = await packRow.getByTestId("badges").locator("> *").allInnerTexts();
  expect(badges.slice(0, 2).map((t) => t.trim())).toEqual(["Pack", "Empresas"]);
  const colors = await badge.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fg: s.color, bg: s.backgroundColor };
  });
  expect(contrast(colors.fg, colors.bg)).toBeGreaterThanOrEqual(4.5);

  await expect(
    page.getByRole("listitem").filter({ hasText: companyProduct }).getByTestId("empresas-badge"),
  ).toHaveText("Empresas");
  await expect(
    page.getByRole("listitem").filter({ hasText: person }).getByTestId("empresas-badge"),
  ).toHaveCount(0);

  // Seeded items count too; no Personas item has a badge.
  const personasRows = page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" });
  await expect(personasRows.getByTestId("empresas-badge")).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "Polera corporativa de ejemplo" }).getByTestId("empresas-badge"),
  ).toBeVisible();

  const labels = await catalogFilters(page).getByRole("link").allInnerTexts();
  expect(labels.map((l) => l.replace(/\s*\(\d+\)$/, ""))).toEqual([
    "Todos los catálogos",
    "Personas",
    "Empresas",
  ]);
  const [todos, personas, empresas] = labels.map(countOf);
  expect(empresas).toBeGreaterThanOrEqual(5);
  expect(todos).toBe(personas + empresas);
  expect(await page.locator('[data-testid="product-group"] li').count()).toBe(todos);
});

test("[002-AC80] choosing a catalog lists only it, combines with the type, and survives a reload", async ({
  page,
}, testInfo) => {
  const companyPack = productName("filtro-pack", testInfo.project.name);
  await signIn(page);
  await createProduct(page, { name: companyPack, audience: "Empresas", kind: "Pack" });

  await page.goto("/panel/productos");
  await catalogFilters(page).getByRole("link", { name: /^Empresas/ }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?catalogo=empresas$/);
  const rows = page.locator('[data-testid="product-group"] li');
  await expect(rows.first()).toBeVisible({ timeout: PAGE_TIMEOUT });
  const total = await rows.count();
  await expect(rows.getByTestId("empresas-badge")).toHaveCount(total);
  await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toHaveCount(0);
  // The type counts are within the catalog: Todos equals the catalog's count.
  const typeLabels = await typeFilters(page).getByRole("link").allInnerTexts();
  const [typeTodos, typeProductos, typePacks] = typeLabels.map(countOf);
  expect(typeTodos).toBe(total);
  expect(typeProductos + typePacks).toBe(typeTodos);
  const catalogLabels = await catalogFilters(page).getByRole("link").allInnerTexts();
  expect(countOf(catalogLabels[2])).toBe(total);

  await typeFilters(page).getByRole("link", { name: /^Packs/ }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?catalogo=empresas&tipo=pack$/);
  await expect(page.getByRole("listitem").filter({ hasText: companyPack })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Polera corporativa de ejemplo" })).toHaveCount(0);

  await page.reload();
  await expect(catalogFilters(page).getByRole("link", { name: /^Empresas/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(typeFilters(page).getByRole("link", { name: /^Packs/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("listitem").filter({ hasText: companyPack })).toBeVisible();

  // Personas, with the type kept.
  await catalogFilters(page).getByRole("link", { name: /^Personas/ }).click();
  await expect(page).toHaveURL(/\/panel\/productos\?catalogo=personas&tipo=pack$/);
  await expect(page.getByRole("listitem").filter({ hasText: "Pack regalo de ejemplo" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("listitem").filter({ hasText: companyPack })).toHaveCount(0);

  // A missing or unknown catalogo lists every catalog.
  for (const path of ["/panel/productos", "/panel/productos?catalogo=otro"]) {
    await page.goto(path);
    await expect(
      catalogFilters(page).getByRole("link", { name: /^Todos los catálogos/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("listitem").filter({ hasText: "Botella de ejemplo" })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    await expect(page.getByRole("listitem").filter({ hasText: companyPack })).toBeVisible();
  }
});

test("[002-AC81] the catalog filters work with the keyboard, mark the current one, wrap without scrolling sideways and pass axe", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/panel/productos");
  const empresas = catalogFilters(page).getByRole("link", { name: /^Empresas/ });
  await empresas.focus();
  expect(
    await empresas.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?catalogo=empresas$/);
  await expect(catalogFilters(page).getByRole("link", { name: /^Empresas/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(catalogFilters(page).locator('[aria-current="page"]')).toHaveCount(1);
  for (const link of await catalogFilters(page).getByRole("link").all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
  ).toEqual([]);
});
