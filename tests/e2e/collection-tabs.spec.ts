import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, "Collection tabs" (criteria 82 to 89, issue #120) against the seeded
// fake items of supabase/seed.sql:
//   Personas, published: "Adorno navideño de ejemplo" (producto) and "Pack
//   navideño de ejemplo" (pack) in navidad; "Cuaderno escolar de ejemplo"
//   (producto) in escolar; "Taza regalo de ejemplo" (producto) in both; the other
//   seeded items in none. "Adorno de ejemplo (borrador)" is unpublished, in
//   navidad. "Regalo de empresa navideño de ejemplo" is an Empresas item in
//   navidad. The case with no collection item at all is in
//   tests/e2e/isolated/collection-tabs-empty.spec.ts.

const PAGE_TIMEOUT = 20_000;

const NAVIDAD_PRODUCT = "Adorno navideño de ejemplo";
const NAVIDAD_PACK = "Pack navideño de ejemplo";
const ESCOLAR_PRODUCT = "Cuaderno escolar de ejemplo";
const BOTH = "Taza regalo de ejemplo";
const NONE_PRODUCT = "Botella de ejemplo";
const NONE_PACK = "Pack regalo de ejemplo";
const DRAFT = "Adorno de ejemplo (borrador)";
const COMPANY = "Regalo de empresa navideño de ejemplo";

const tabs = (page: Page) => page.getByRole("navigation", { name: "Colecciones" });
const productos = (page: Page) => page.locator("#productos");
const packs = (page: Page) => page.locator("#packs");
const card = (section: ReturnType<Page["locator"]>, name: string) =>
  section.getByRole("heading", { level: 3, name, exact: true });

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(tabs(page)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(productos(page).locator("article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
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

test("[002-AC82] the home page shows the Colecciones row between the hero and Productos, with Todos chosen and every item listed", async ({
  page,
}) => {
  await open(page, "/");
  const links = tabs(page).getByRole("link");
  expect((await links.allInnerTexts()).map((t) => t.trim())).toEqual([
    "Todos",
    "Especial Navidad",
    "Especial Escolar",
  ]);
  await expect(tabs(page)).toHaveAttribute("id", "colecciones");
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(tabs(page).getByRole("link", { name: "Todos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs(page).getByRole("link", { name: "Especial Navidad" })).toHaveAttribute(
    "href",
    "/?coleccion=navidad#colecciones",
  );
  await expect(tabs(page).getByRole("link", { name: "Especial Escolar" })).toHaveAttribute(
    "href",
    "/?coleccion=escolar#colecciones",
  );
  await expect(tabs(page).getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/");

  // Between the hero and the Productos section.
  const order = await page.evaluate(() => {
    const y = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top;
    return {
      hero: document.querySelector("#inicio")!.getBoundingClientRect().top,
      tabs: y("nav[aria-label='Colecciones']"),
      productos: y("#productos"),
    };
  });
  expect(order.hero).toBeLessThan(order.tabs);
  expect(order.tabs).toBeLessThan(order.productos);

  for (const name of [NAVIDAD_PRODUCT, ESCOLAR_PRODUCT, BOTH, NONE_PRODUCT]) {
    await expect(card(productos(page), name), name).toBeVisible();
  }
  for (const name of [NAVIDAD_PACK, NONE_PACK]) {
    await expect(card(packs(page), name), name).toBeVisible();
  }
  await expect(card(productos(page), DRAFT)).toHaveCount(0);
  await expect(card(productos(page), COMPANY)).toHaveCount(0);
});

test("[002-AC83] Especial Navidad lists only its products and its packs, and Especial Escolar hides Packs", async ({
  page,
}) => {
  await open(page, "/?coleccion=navidad");
  await expect(tabs(page).getByRole("link", { name: "Especial Navidad" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2, name: "Productos" })).toBeVisible();
  await expect(card(productos(page), NAVIDAD_PRODUCT)).toBeVisible();
  await expect(card(productos(page), BOTH)).toBeVisible();
  await expect(card(productos(page), ESCOLAR_PRODUCT)).toHaveCount(0);
  await expect(card(productos(page), NONE_PRODUCT)).toHaveCount(0);
  await expect(card(packs(page), NAVIDAD_PACK)).toBeVisible();
  await expect(card(packs(page), NONE_PACK)).toHaveCount(0);

  await open(page, "/?coleccion=escolar");
  await expect(tabs(page).getByRole("link", { name: "Especial Escolar" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(card(productos(page), ESCOLAR_PRODUCT)).toBeVisible();
  await expect(card(productos(page), BOTH)).toBeVisible();
  await expect(card(productos(page), NAVIDAD_PRODUCT)).toHaveCount(0);
  await expect(card(productos(page), NONE_PRODUCT)).toHaveCount(0);
  await expect(page.locator("#packs")).toHaveCount(0);
  // The wholesale note and the headings do not change.
  await expect(productos(page).locator("p").first()).toBeVisible();
});

test("[002-AC84] an unknown value shows Todos, and the tabs stay", async ({ page }) => {
  for (const path of ["/?coleccion=otra", "/?coleccion=", "/?coleccion=Navidad", "/?coleccion=todos"]) {
    await open(page, path);
    await expect(tabs(page).getByRole("link", { name: "Todos" }), path).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(card(productos(page), NONE_PRODUCT), path).toBeVisible();
    await expect(card(packs(page), NONE_PACK), path).toBeVisible();
  }
});

test("[002-AC85] membership: both collections, none, a draft and an Empresas item; /empresas ignores the parameter", async ({
  page,
}) => {
  await open(page, "/?coleccion=navidad");
  await expect(card(productos(page), BOTH)).toBeVisible();
  await open(page, "/?coleccion=escolar");
  await expect(card(productos(page), BOTH)).toBeVisible();
  await open(page, "/");
  await expect(card(productos(page), BOTH)).toBeVisible();
  await expect(card(productos(page), NONE_PRODUCT)).toBeVisible();

  for (const path of ["/", "/?coleccion=navidad", "/?coleccion=escolar"]) {
    await open(page, path);
    await expect(card(page.locator("main"), DRAFT), path).toHaveCount(0);
    await expect(card(page.locator("main"), COMPANY), path).toHaveCount(0);
  }
  await open(page, "/?coleccion=navidad");
  await expect(card(productos(page), NONE_PRODUCT)).toHaveCount(0);

  await page.goto("/empresas?coleccion=navidad");
  await expect(card(page.locator("#productos"), COMPANY)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(card(page.locator("#productos"), "Polera corporativa de ejemplo")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Colecciones" })).toHaveCount(0);
});

// Without JavaScript the browser cannot show anything the page streams after its
// shell: React moves a streamed Suspense boundary into place with a script, so
// the catalog (and the tabs) stay in the markup but hidden. That is how the whole
// catalog already behaves, not something the tabs add. So with JavaScript off the
// test checks what the plain links promise: each is an ordinary link with the
// choice in its address, and loading that address, as a click or a shared link
// does, gives the same view, with the home page's metadata.
// The home page declares no canonical link today (only /empresas and the product
// pages do), so "the home page's canonical" is whatever it is on "/" (none): a tab
// must not add or change one.
const canonicalOf = async (page: Page) => {
  const link = page.locator('link[rel="canonical"]');
  return (await link.count()) === 0 ? null : link.getAttribute("href");
};

const tabsInMarkup = (page: Page) => page.locator("nav#colecciones");

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("[002-AC86] choosing Especial Navidad is a plain link to /?coleccion=navidad#colecciones, the same view loads from that address in another browser, with the home page's metadata", async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.goto("/");
    await expect(tabsInMarkup(page)).toBeAttached({ timeout: PAGE_TIMEOUT });
    const homeTitle = await page.title();
    const homeDescription = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    const homeCanonical = await canonicalOf(page);

    // A plain anchor: no button, no handler, the address is in the href.
    const link = tabsInMarkup(page).locator("a", { hasText: "Especial Navidad" });
    const href = await link.getAttribute("href");
    expect(href).toBe("/?coleccion=navidad#colecciones");
    expect(await link.evaluate((el) => el.tagName)).toBe("A");

    await page.goto(href!);
    await expect(page).toHaveURL(/\/\?coleccion=navidad#colecciones$/);
    await expect(tabsInMarkup(page)).toBeAttached({ timeout: PAGE_TIMEOUT });
    const navidad = tabsInMarkup(page).locator("a", { hasText: "Especial Navidad" });
    await expect(navidad).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#productos h3", { hasText: NAVIDAD_PRODUCT })).toBeAttached();
    await expect(page.locator("#productos h3", { hasText: NONE_PRODUCT })).toHaveCount(0);

    expect(await page.title()).toBe(homeTitle);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBe(
      homeDescription,
    );
    expect(await canonicalOf(page)).toBe(homeCanonical);

    // The same address in another browser context shows the same view.
    const other = await browser.newContext({ javaScriptEnabled: false });
    try {
      const otherPage = await other.newPage();
      await otherPage.goto(`${baseURL}/?coleccion=navidad#colecciones`);
      await expect(tabsInMarkup(otherPage)).toBeAttached({ timeout: PAGE_TIMEOUT });
      await expect(
        tabsInMarkup(otherPage).locator("a", { hasText: "Especial Navidad" }),
      ).toHaveAttribute("aria-current", "page");
      await expect(otherPage.locator("#productos h3", { hasText: NAVIDAD_PRODUCT })).toBeAttached();
      await expect(otherPage.locator("#productos h3", { hasText: NONE_PRODUCT })).toHaveCount(0);
    } finally {
      await other.close();
    }

    // The sitemap has the home page and no address with the parameter.
    const sitemap = await (await page.request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("coleccion");
  });
});

test("[002-AC87] the tabs work with the keyboard, are at least 44 px, wrap without sideways scroll, have contrast and pass axe", async ({
  page,
}) => {
  await open(page, "/?coleccion=navidad");
  const links = tabs(page).getByRole("link");
  for (const link of await links.all()) {
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  // Reachable with the keyboard, with a visible focus.
  const escolar = tabs(page).getByRole("link", { name: "Especial Escolar" });
  await escolar.focus();
  expect(
    await escolar.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?coleccion=escolar#colecciones$/);
  await expect(tabs(page).getByRole("link", { name: "Especial Escolar" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs(page).locator('[aria-current="page"]')).toHaveCount(1);

  // Contrast: the chosen tab and a not chosen one.
  for (const name of ["Especial Escolar", "Todos"]) {
    const colors = await tabs(page)
      .getByRole("link", { name })
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { fg: s.color, bg: s.backgroundColor };
      });
    expect(contrast(colors.fg, colors.bg), name).toBeGreaterThanOrEqual(4.5);
  }

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  expect(
    await tabs(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);

  // All visible text of the row is Spanish.
  expect((await tabs(page).allInnerTexts()).join(" ")).toMatch(/Todos/);

  for (const path of ["/", "/?coleccion=navidad", "/?coleccion=escolar"]) {
    await open(page, path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(
      violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
      path,
    ).toEqual([]);
  }
});

test("[002-AC89] with a special tab chosen, the header links are the same and Productos and Packs lead to the page without coleccion", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Secciones" });
  await open(page, "/?coleccion=navidad");
  await expect(nav.getByRole("link", { name: "Packs", exact: true })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const texts = await nav
    .locator("a")
    .allInnerTexts()
    .then((all) => all.map((t) => t.trim()).filter((t) => !/^(Entrar|Admin|Mi panel)$/.test(t)));
  expect(texts).toEqual([
    "Productos",
    "Packs",
    "Catálogo empresa",
    "Cómo pedir",
    "Colegios y grupos",
  ]);
  await expect(nav.getByRole("link", { name: "Productos", exact: true })).toHaveAttribute(
    "href",
    "/#productos",
  );
  await expect(nav.getByRole("link", { name: "Packs", exact: true })).toHaveAttribute(
    "href",
    "/#packs",
  );

  await nav.getByRole("link", { name: "Packs", exact: true }).click();
  await expect(page).toHaveURL(/\/#packs$/);
  await expect(page).not.toHaveURL(/coleccion/);
  await expect(card(packs(page), NONE_PACK)).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(tabs(page).getByRole("link", { name: "Todos" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // On "Todos" the links are the anchors of the page, as before.
  await expect(nav.getByRole("link", { name: "Productos", exact: true })).toHaveAttribute(
    "href",
    "#productos",
  );
});

// The admin form (criterion 88). The test makes its own product, named with the
// project and a run id (both viewports run at once on one database).
test.describe("admin form", () => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let admin: SupabaseClient;
  let ADMIN: { email: string; password: string };
  let removeAdmin: () => Promise<void>;

  test.beforeAll(async () => {
    const created = await createTestAdmin("collections");
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

  const group = (page: Page) => page.getByRole("group", { name: "Colecciones" });

  test("[002-AC88] the form has the Colecciones field, none checked for a new item, and saving moves the item between tabs without a deploy", async ({
    page,
  }, testInfo) => {
    const name = `Colección ${testInfo.project.name} e2e ${run}`;
    await page.goto("/entrar");
    await page.getByLabel("Correo").fill(ADMIN.email);
    await page.getByLabel("Contraseña").fill(ADMIN.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/panel$/);

    await page.goto("/panel/productos/nuevo");
    await expect(group(page)).toBeVisible();
    const boxes = group(page).getByRole("checkbox");
    await expect(boxes).toHaveCount(2);
    await expect(group(page).getByRole("checkbox", { name: "Especial Navidad" })).not.toBeChecked();
    await expect(group(page).getByRole("checkbox", { name: "Especial Escolar" })).not.toBeChecked();
    await expect(group(page).getByText("Todos los productos salen siempre en «Todos».")).toBeVisible();

    await page.getByLabel("Nombre", { exact: true }).fill(name);
    await page.getByLabel("Publicado", { exact: true }).check();
    await group(page).getByRole("checkbox", { name: "Especial Navidad" }).check();
    await page.getByRole("button", { name: "Guardar producto" }).click();
    await expect(page.getByRole("heading", { name: "Editar producto" })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    const edit = page.url();
    await expect(group(page).getByRole("checkbox", { name: "Especial Navidad" })).toBeChecked();
    await expect(group(page).getByRole("checkbox", { name: "Especial Escolar" })).not.toBeChecked();

    await open(page, "/?coleccion=navidad");
    await expect(card(productos(page), name)).toBeVisible();
    await open(page, "/?coleccion=escolar");
    await expect(card(productos(page), name)).toHaveCount(0);
    await open(page, "/");
    await expect(card(productos(page), name)).toBeVisible();

    await page.goto(edit);
    await group(page).getByRole("checkbox", { name: "Especial Navidad" }).uncheck();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Producto guardado." })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    await expect(group(page).getByRole("checkbox", { name: "Especial Navidad" })).not.toBeChecked();

    await open(page, "/?coleccion=navidad");
    await expect(card(productos(page), name)).toHaveCount(0);
    await open(page, "/");
    await expect(card(productos(page), name)).toBeVisible();
  });
});
