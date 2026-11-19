import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "../supabase";

// Spec 002, 2026-11-19 amendment (issue #174), criteria 121 to 124 and 126 to 128:
// the "Casual" tab. The seeded catalog has no Casual item on purpose (the tests of
// criteria 82 to 96 count three tabs), so this file inserts its own fake Casual
// items and removes them at the end. While they exist the home page shows four
// tabs, which would break those tests if they ran at the same time: that is why
// it lives in tests/e2e/isolated/ (see playwright.config.ts).

const PAGE_TIMEOUT = 20_000;
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const SEEDED_NONE_PRODUCT = "Botella de ejemplo";
const SEEDED_NONE_PACK = "Pack regalo de ejemplo";
const SEEDED_NAVIDAD_PRODUCT = "Adorno navideño de ejemplo";

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];
let names: { product: string; both: string; pack: string };

const tabs = (page: Page) => page.getByRole("navigation", { name: "Colecciones" });
const link = (page: Page, name: string) => tabs(page).getByRole("link", { name, exact: true });
const productos = (page: Page) => page.locator("#productos");
const packs = (page: Page) => page.locator("#packs");
const card = (section: Locator, name: string) =>
  section.getByRole("heading", { level: 3, name, exact: true });

async function insert(row: Record<string, unknown>) {
  const { data, error } = await admin.from("product").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  productIds.push(data.id);
}

test.beforeAll(async ({}, testInfo) => {
  const created = await createTestAdmin("casual-collection");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.signInWithPassword(ADMIN);
  if (error) throw new Error(error.message);

  const tag = `${testInfo.project.name} casual e2e ${run}`;
  names = {
    product: `Polera casual ${tag}`,
    both: `Polerón casual y navideño ${tag}`,
    pack: `Pack casual ${tag}`,
  };
  const base = { audience: "personas", is_published: true, is_available: true };
  const slug = (s: string) => `e2e-casual-${s}-${testInfo.project.name}-${run}`;
  await insert({ ...base, slug: slug("p"), name: names.product, kind: "producto", collections: ["casual"] });
  await insert({
    ...base,
    slug: slug("b"),
    name: names.both,
    kind: "producto",
    collections: ["casual", "navidad"],
  });
  await insert({ ...base, slug: slug("k"), name: names.pack, kind: "pack", collections: ["casual"] });
  await refreshCatalog(ADMIN);
});

test.afterAll(async () => {
  await admin.from("product").delete().like("name", `%casual e2e ${run}%`);
  // Leave the cache as the database is, for whatever runs next.
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(tabs(page)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(productos(page).locator("article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
}

async function signIn(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test("[002-AC121] the row shows Todos, Casual, Especial Navidad and Escolar in that order, with their links, and nothing reads Especial Escolar", async ({
  page,
}) => {
  await open(page, "/");
  expect((await tabs(page).getByRole("link").allInnerTexts()).map((t) => t.trim())).toEqual([
    "Todos",
    "Casual",
    "Especial Navidad",
    "Escolar",
  ]);
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(link(page, "Todos")).toHaveAttribute("aria-current", "page");
  await expect(link(page, "Todos")).toHaveAttribute("href", "/");
  await expect(link(page, "Casual")).toHaveAttribute("href", "/?coleccion=casual#colecciones");
  await expect(link(page, "Especial Navidad")).toHaveAttribute(
    "href",
    "/?coleccion=navidad#colecciones",
  );
  await expect(link(page, "Escolar")).toHaveAttribute("href", "/?coleccion=escolar#colecciones");
  expect(await page.locator("body").innerText()).not.toMatch(/Especial Escolar/i);

  await signIn(page);
  await page.goto("/panel/productos/nuevo");
  await expect(page.getByRole("group", { name: "Colecciones" })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(/Especial Escolar/i);
  await page.goto("/panel/productos");
  expect(await page.locator("body").innerText()).not.toMatch(/Especial Escolar/i);
});

test("[002-AC122] /?coleccion=casual lists only the Casual products and pack; the product in both is also in Navidad; all are in Todos", async ({
  page,
}) => {
  await open(page, "/?coleccion=casual");
  await expect(link(page, "Casual")).toHaveAttribute("aria-current", "page");
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(card(productos(page), names.product)).toBeVisible();
  await expect(card(productos(page), names.both)).toBeVisible();
  await expect(card(productos(page), SEEDED_NONE_PRODUCT)).toHaveCount(0);
  await expect(card(productos(page), SEEDED_NAVIDAD_PRODUCT)).toHaveCount(0);
  await expect(card(packs(page), names.pack)).toBeVisible();
  await expect(card(packs(page), SEEDED_NONE_PACK)).toHaveCount(0);
  await expect(productos(page).locator("article")).toHaveCount(2);
  await expect(packs(page).locator("article")).toHaveCount(1);

  await open(page, "/?coleccion=navidad");
  await expect(card(productos(page), names.both)).toBeVisible();
  await expect(card(productos(page), names.product)).toHaveCount(0);

  await open(page, "/");
  for (const name of [names.product, names.both, SEEDED_NONE_PRODUCT]) {
    await expect(card(productos(page), name), name).toBeVisible();
  }
  for (const name of [names.pack, SEEDED_NONE_PACK]) {
    await expect(card(packs(page), name), name).toBeVisible();
  }
});

const canonicalOf = async (page: Page) => {
  const l = page.locator('link[rel="canonical"]');
  return (await l.count()) === 0 ? null : l.getAttribute("href");
};
const tabsInMarkup = (page: Page) => page.locator("nav#colecciones");

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("[002-AC124] choosing Casual is a plain link to /?coleccion=casual#colecciones, the same view loads from that address in another browser, with the home page's metadata", async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto("/");
    await expect(tabsInMarkup(page)).toBeAttached({ timeout: PAGE_TIMEOUT });
    const homeTitle = await page.title();
    const homeDescription = await page.locator('meta[name="description"]').getAttribute("content");
    const homeCanonical = await canonicalOf(page);

    const anchor = tabsInMarkup(page).locator("a", { hasText: "Casual" });
    const href = await anchor.getAttribute("href");
    expect(href).toBe("/?coleccion=casual#colecciones");
    expect(await anchor.evaluate((el) => el.tagName)).toBe("A");

    await page.goto(href!);
    await expect(page).toHaveURL(/\/\?coleccion=casual#colecciones$/);
    await expect(tabsInMarkup(page)).toBeAttached({ timeout: PAGE_TIMEOUT });
    await expect(tabsInMarkup(page).locator("a", { hasText: "Casual" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("#productos h3", { hasText: names.product })).toBeAttached();
    await expect(page.locator("#productos h3", { hasText: SEEDED_NONE_PRODUCT })).toHaveCount(0);
    expect(await page.title()).toBe(homeTitle);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBe(
      homeDescription,
    );
    expect(await canonicalOf(page)).toBe(homeCanonical);

    const other = await browser.newContext({ javaScriptEnabled: false });
    try {
      const otherPage = await other.newPage();
      await otherPage.goto(`${baseURL}/?coleccion=casual#colecciones`);
      await expect(tabsInMarkup(otherPage)).toBeAttached({ timeout: PAGE_TIMEOUT });
      await expect(
        tabsInMarkup(otherPage).locator("a", { hasText: "Casual" }),
      ).toHaveAttribute("aria-current", "page");
      await expect(otherPage.locator("#productos h3", { hasText: names.product })).toBeAttached();
      await expect(otherPage.locator("#productos h3", { hasText: SEEDED_NONE_PRODUCT })).toHaveCount(0);
    } finally {
      await other.close();
    }

    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("coleccion");
  });
});

test("[002-AC126] the form has exactly Casual, Especial Navidad and Escolar, none checked, and saving moves the item in and out of the Casual tab without a deploy", async ({
  page,
}, testInfo) => {
  const name = `Panel ${testInfo.project.name} casual e2e ${run}`;
  await signIn(page);
  await page.goto("/panel/productos/nuevo");
  const group = page.getByRole("group", { name: "Colecciones" });
  await expect(group).toBeVisible();
  const boxes = group.getByRole("checkbox");
  await expect(boxes).toHaveCount(3);
  expect(
    await boxes.evaluateAll((els) => els.map((el) => el.parentElement?.textContent?.trim())),
  ).toEqual(["Casual", "Especial Navidad", "Escolar"]);
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await expect(group.getByText("Todos los productos salen siempre en «Todos».")).toBeVisible();

  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Publicado", { exact: true }).check();
  await group.getByRole("checkbox", { name: "Casual" }).check();
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const edit = page.url();
  await expect(group.getByRole("checkbox", { name: "Casual" })).toBeChecked();

  await open(page, "/?coleccion=casual");
  await expect(card(productos(page), name)).toBeVisible();
  await open(page, "/");
  await expect(card(productos(page), name)).toBeVisible();

  await page.goto(edit);
  await group.getByRole("checkbox", { name: "Casual" }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });

  await open(page, "/?coleccion=casual");
  await expect(card(productos(page), name)).toHaveCount(0);
  await open(page, "/");
  await expect(card(productos(page), name)).toBeVisible();
});

test("[002-AC127] the Casual tab has its SVG illustration to the left of its label, the same height as the others, and its chosen style", async ({
  page,
}, testInfo) => {
  await open(page, "/");
  const a = link(page, "Casual");
  const img = a.locator("img");
  await expect(img).toHaveAttribute("src", "/img/tab-casual.svg");
  await expect(img).toHaveAttribute("alt", "");
  await expect(img).toHaveAttribute("width", /^\d+$/);
  await expect(img).toHaveAttribute("height", /^\d+$/);
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
    true,
  );
  const imgBox = (await img.boundingBox())!;
  const labelBox = (await a.locator("span").boundingBox())!;
  expect(imgBox.x + imgBox.width).toBeLessThanOrEqual(labelBox.x + 1);
  const heights = new Set<number>();
  for (const label of ["Todos", "Casual", "Especial Navidad", "Escolar"]) {
    heights.add(Math.round((await link(page, label).locator("img").boundingBox())!.height));
  }
  expect([...heights]).toEqual([testInfo.project.name.includes("360") ? 44 : 56]);

  const res = await page.request.get("/img/tab-casual.svg");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\/svg\+xml/);
  expect((await res.body()).length).toBeLessThanOrEqual(30 * 1024);

  const look = (el: Locator) =>
    el.evaluate((node) => {
      const s = getComputedStyle(node);
      return { bg: s.backgroundColor, border: parseFloat(s.borderTopWidth), shadow: s.boxShadow };
    });
  await open(page, "/?coleccion=casual");
  const chosen = await look(link(page, "Casual"));
  expect(chosen.bg).toBe("rgb(251, 235, 200)");
  expect(chosen.border).toBe(3);
  expect(chosen.shadow).toMatch(/rgb\(20, 24, 36\) 3px 3px 0px/);
  for (const label of ["Todos", "Especial Navidad", "Escolar"]) {
    const other = await look(link(page, label));
    expect(other.bg, label).toBe("rgb(255, 255, 255)");
    expect(other.border, label).toBe(2);
    expect(other.shadow, label).toBe("none");
  }
});

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("[002-AC128] the four tabs work with the keyboard, are at least 44 px, fit on one line at 1280 px, do not scroll sideways at 360 px, have contrast and pass axe", async ({
  page,
}, testInfo) => {
  const wide = !testInfo.project.name.includes("360");
  const labels = ["Todos", "Casual", "Especial Navidad", "Escolar"];
  for (const path of ["/", "/?coleccion=casual"]) {
    await open(page, path);
    const tops = new Set<number>();
    for (const label of labels) {
      const a = link(page, label);
      const box = (await a.boundingBox())!;
      expect(box.height, label).toBeGreaterThanOrEqual(44);
      expect(box.width, label).toBeGreaterThanOrEqual(44);
      tops.add(Math.round(box.y));
      const c = await a.evaluate((el) => {
        const s = getComputedStyle(el);
        return { fg: s.color, bg: s.backgroundColor };
      });
      expect(contrast(c.fg, c.bg), label).toBeGreaterThanOrEqual(4.5);
    }
    if (wide) expect(tops.size, "one line at 1280 px").toBe(1);
    else expect(tops.size, "two rows at 360 px").toBe(2);
    expect(contrast("rgb(20, 24, 36)", "rgb(251, 245, 233)")).toBeGreaterThanOrEqual(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      path,
    ).toBe(true);
    expect(await tabs(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
      path,
    ).toEqual([]);
  }

  // Keyboard: reach Casual by Tab from Todos, see the focus, choose it with Enter.
  await open(page, "/");
  await link(page, "Todos").focus();
  await page.keyboard.press("Tab");
  const casual = link(page, "Casual");
  await expect(casual).toBeFocused();
  expect(
    await casual.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 3;
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?coleccion=casual#colecciones$/);
  await expect(link(page, "Casual")).toHaveAttribute("aria-current", "page");
  expect((await tabs(page).allInnerTexts()).join(" ")).toMatch(/Todos/);
});

// Screenshots for the PR (not asserted): set TAB_SCREENSHOTS=<dir> to write them.
test("screenshot of the tabs with Casual chosen", async ({ page }, testInfo) => {
  const dir = process.env.TAB_SCREENSHOTS;
  if (!dir) return;
  await open(page, "/?coleccion=casual");
  await tabs(page).screenshot({ path: `${dir}/tabs-${testInfo.project.name}-casual.png` });
});
