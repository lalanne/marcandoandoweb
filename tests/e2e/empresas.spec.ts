import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, "Catálogo empresa" (criteria 68 to 77, issue #107). Reads the
// seeded fake company items (supabase/seed.sql: all priced 2000, which must never
// show) and a few throwaway items made as a throwaway admin and removed after.
// The cases with no published Empresas item are in isolated/empresas-empty.spec.ts.

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PAGE_TIMEOUT = 20_000;
const WA = "https://wa.me/56982661835";
const COMPANY_GENERAL =
  "Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar. Te cuento qué necesitamos:";
const PERSONAS_GENERAL = "Hola, Marcando Ando. Quiero cotizar. Te cuento mi idea:";
const INTRO =
  "Poleras, polerones, tazones, botellas y regalos con el logo de tu empresa. Cotiza por volumen por WhatsApp.";
const NOTE = "Precios según cantidad: cotiza por WhatsApp.";
const WHOLESALE = "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.";

const SEED_PRODUCT = { slug: "demo-empresa-polera", name: "Polera corporativa de ejemplo" };
const SEED_PACK = { slug: "demo-empresa-pack", name: "Pack bienvenida de ejemplo" };

const gone = {
  name: `Gorra empresa agotada e2e ${run}`,
  slug: `e2e-empresa-agotada-${run}`,
};

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];

test.beforeAll(async () => {
  const created = await createTestAdmin("empresas");
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await admin.auth.signInWithPassword(created);
  if (signIn.error) throw new Error(signIn.error.message);
  const p = await admin
    .from("product")
    .insert({
      slug: gone.slug,
      name: gone.name,
      audience: "empresas",
      price_from_clp: 7000,
      is_published: true,
      is_available: false,
    })
    .select("id")
    .single();
  if (p.error) throw new Error(p.error.message);
  productIds.push(p.data.id);
});

test.afterAll(async () => {
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
  await removeAdmin();
});

const nav = (page: Page) => page.getByRole("navigation", { name: "Secciones" });

async function headerLinks(page: Page) {
  return nav(page)
    .locator("a")
    .evaluateAll((els) =>
      els
        .map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") }))
        .filter((l) => !/^(Admin|Mi panel)$/.test(l.text)),
    );
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

async function openEmpresas(page: Page) {
  await page.goto("/empresas");
  await expect(page.locator("#productos article").first()).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

function messageOf(href: string | null): string {
  return new URL(href ?? "").searchParams.get("text") ?? "";
}

test("[002-AC68] the home page lists only Personas items", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.locator("#packs article").first()).toBeVisible();
  await expect(page.getByText("Pack regalo de ejemplo").first()).toBeVisible();
  for (const name of [SEED_PRODUCT.name, SEED_PACK.name, "Taza corporativa de ejemplo", gone.name]) {
    await expect(page.getByText(name)).toHaveCount(0);
  }
  await expect(page.locator(`a[href="/productos/${SEED_PRODUCT.slug}"]`)).toHaveCount(0);
});

test("[002-AC69] with an Empresas item published, the header links are the five, in order, on the home page, a product page and /empresas", async ({
  page,
}) => {
  const expected = (base: string) => [
    { text: "Productos", href: `${base}#productos` },
    { text: "Packs", href: `${base}#packs` },
    { text: "Catálogo empresa", href: "/empresas" },
    { text: "Cómo pedir", href: `${base}#como-pedir` },
    { text: "Colegios y grupos", href: `${base}#colegios` },
  ];
  for (const [path, base] of [
    ["/", ""],
    ["/productos/demo-botella-ejemplo", "/"],
    [`/productos/${SEED_PRODUCT.slug}`, "/"],
    ["/empresas", "/"],
  ] as const) {
    await page.goto(path);
    await expect(nav(page).getByRole("link", { name: "Catálogo empresa" })).toBeVisible({
      timeout: PAGE_TIMEOUT,
    });
    expect(await headerLinks(page), path).toEqual(expected(base));
    await noHorizontalScroll(page);
  }
});

test("[002-AC69] on /empresas the link is the current page, and only there", async ({ page }) => {
  await page.goto("/empresas");
  const link = nav(page).getByRole("link", { name: "Catálogo empresa" });
  await expect(link).toHaveAttribute("aria-current", "page", { timeout: PAGE_TIMEOUT });
  await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1);
  await page.goto("/");
  await expect(nav(page).getByRole("link", { name: "Catálogo empresa" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("[002-AC71] /empresas shows the heading, intro, button, then Productos and Packs of Empresas only, highlighted first", async ({
  page,
}) => {
  await openEmpresas(page);
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo empresa" })).toBeVisible();
  await expect(page.getByText(INTRO, { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Cotizar por WhatsApp" })).toBeVisible();

  // Document order: heading, intro, button, Productos, Packs.
  const order = await page.evaluate(() => {
    const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : null);
    const main = document.querySelector("main")!;
    return [
      top(main.querySelector("h1")),
      top([...main.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Poleras")) ?? null),
      top([...main.querySelectorAll("a")].find((a) => a.textContent === "Cotizar por WhatsApp") ?? null),
      top(document.getElementById("productos")),
      top(document.getElementById("packs")),
    ];
  });
  expect(order.every((t) => t !== null)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => (a ?? 0) - (b ?? 0)));

  const products = page.locator("#productos article");
  await expect(page.locator("#productos").getByRole("heading", { level: 2 })).toHaveText("Productos");
  await expect(page.locator("#packs").getByRole("heading", { level: 2 })).toHaveText("Packs");
  // The featured seeded product first, then the other.
  const names = await products.getByRole("heading", { level: 3 }).allInnerTexts();
  expect(names.indexOf(SEED_PRODUCT.name)).toBe(0);
  expect(names).toContain("Taza corporativa de ejemplo");
  expect(names).not.toContain("Botella de ejemplo");
  await expect(page.locator("#packs").getByRole("heading", { name: SEED_PACK.name })).toBeVisible();
  await expect(page.locator("#packs").getByRole("heading", { name: "Pack regalo de ejemplo" })).toHaveCount(0);
  // No draft.
  await expect(page.getByText("Producto de empresa de ejemplo (borrador)")).toHaveCount(0);
  await expect(page.getByText("Pack de empresa de ejemplo (borrador)")).toHaveCount(0);
});

test("[002-AC73] no Empresas card or page shows a price, and each section has the company note once", async ({
  page,
}) => {
  await openEmpresas(page);
  const main = page.getByRole("main");
  await expect(main).not.toContainText("$");
  await expect(main).not.toContainText("c/u");
  await expect(main).not.toContainText(WHOLESALE);
  for (const id of ["productos", "packs"]) {
    const section = page.locator(`#${id}`);
    await expect(section.getByText(NOTE, { exact: true })).toHaveCount(1);
    // Right under the heading.
    const next = await section
      .getByRole("heading", { level: 2 })
      .evaluate((h) => h.nextElementSibling?.textContent ?? "");
    expect(next).toBe(NOTE);
    // Colors can come as oklab(): draw them on a canvas to read plain RGB, and
    // lay a translucent background over the ones behind it.
    const ratio = await section.getByText(NOTE, { exact: true }).evaluate((el) => {
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      const rgba = (css: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      let bg = [255, 255, 255];
      const chain: Element[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) chain.unshift(n);
      for (const n of chain) {
        const [r, g, b, a] = rgba(getComputedStyle(n).backgroundColor);
        bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
      }
      const fg = rgba(getComputedStyle(el).color).slice(0, 3);
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }

  await page.goto(`/productos/${SEED_PRODUCT.slug}`);
  const heading = page.getByRole("heading", { level: 1, name: SEED_PRODUCT.name });
  await expect(heading).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(page.getByRole("main")).not.toContainText("$");
  await expect(page.getByRole("main")).not.toContainText("c/u");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  const ogDescription = await page.locator('meta[property="og:description"]').getAttribute("content");
  for (const text of [description, ogDescription]) {
    expect(text).not.toContain("$");
    expect(text).not.toContain("2.000");
    expect(text).not.toContain("c/u");
  }
});

test("[002-AC73] the home page keeps its wholesale note and no company note", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#productos article").first()).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(page.getByText(WHOLESALE).first()).toBeVisible();
  await expect(page.getByText(NOTE)).toHaveCount(0);
});

test("[002-AC74] an available Empresas page links back to its section and orders with the company message", async ({
  page,
}) => {
  await page.goto(`/productos/${SEED_PRODUCT.slug}`);
  const back = page.getByRole("main").getByRole("link", { name: "Volver a catálogo empresa" });
  await expect(back).toHaveAttribute("href", "/empresas#productos", { timeout: PAGE_TIMEOUT });
  const order = page.getByRole("link", { name: "Pedir por WhatsApp" });
  const href = await order.getAttribute("href");
  expect(href?.startsWith(`${WA}?text=`)).toBe(true);
  expect(messageOf(href)).toBe(
    `Hola, Marcando Ando. Escribo por mi empresa y quiero cotizar: ${SEED_PRODUCT.name}. Te cuento qué necesitamos:`,
  );

  await page.goto(`/productos/${SEED_PACK.slug}`);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Volver a catálogo empresa" }),
  ).toHaveAttribute("href", "/empresas#packs", { timeout: PAGE_TIMEOUT });

});

test("[002-AC74] an unavailable Empresas item says so and has no order button", async ({ page }) => {
  await page.goto(`/productos/${gone.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: gone.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByText("no disponible por ahora")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pedir por WhatsApp" })).toHaveCount(0);
});

test("[002-AC75] /empresas and an Empresas page use the company general message", async ({ page }) => {
  await openEmpresas(page);
  const button = page.getByRole("main").getByRole("link", { name: "Cotizar por WhatsApp" });
  const floating = page.getByRole("link", { name: "WhatsApp", exact: true });
  for (const link of [button, floating]) {
    const href = await link.getAttribute("href");
    expect(href?.startsWith(`${WA}?text=`)).toBe(true);
    expect(messageOf(href)).toBe(COMPANY_GENERAL);
  }
  await page.goto(`/productos/${SEED_PRODUCT.slug}`);
  const floatingOnPage = page.getByRole("link", { name: "WhatsApp", exact: true });
  await expect(floatingOnPage).toBeVisible({ timeout: PAGE_TIMEOUT });
  expect(messageOf(await floatingOnPage.getAttribute("href"))).toBe(COMPANY_GENERAL);
});

test("[002-AC75] the home page and a Personas page keep the general message", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "WhatsApp", exact: true })).toBeVisible();
  expect(
    messageOf(await page.getByRole("link", { name: "WhatsApp", exact: true }).getAttribute("href")),
  ).toBe(PERSONAS_GENERAL);
  for (const link of await page.getByRole("link", { name: "Cotizar por WhatsApp" }).all()) {
    expect(messageOf(await link.getAttribute("href"))).toBe(PERSONAS_GENERAL);
  }
  await page.goto("/productos/demo-botella-ejemplo");
  const floating = page.getByRole("link", { name: "WhatsApp", exact: true });
  await expect(floating).toBeVisible({ timeout: PAGE_TIMEOUT });
  expect(messageOf(await floating.getAttribute("href"))).toBe(PERSONAS_GENERAL);
  expect(
    messageOf(await page.getByRole("link", { name: "Pedir por WhatsApp" }).getAttribute("href")),
  ).toBe("Hola, Marcando Ando. Quiero cotizar: Botella de ejemplo. Te cuento mi idea:");
});

test("[002-AC76] /empresas has its title, description, canonical address and Open Graph tags", async ({
  page,
}) => {
  await page.goto("/empresas");
  await expect(page).toHaveTitle("Catálogo empresa | Marcando Ando");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description?.length).toBeGreaterThan(20);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical?.endsWith("/empresas")).toBe(true);
  expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBe(
    "Catálogo empresa | Marcando Ando",
  );
  expect(await page.locator('meta[property="og:description"]').getAttribute("content")).toBe(
    description,
  );
  expect((await page.locator('meta[property="og:url"]').getAttribute("content"))?.endsWith("/empresas")).toBe(
    true,
  );
});

test("[002-AC76] the sitemap lists /empresas and every published Empresas item, and no unpublished one", async ({
  request,
}) => {
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBe(true);
  const xml = await res.text();
  expect(xml).toMatch(/<loc>[^<]*\/empresas<\/loc>/);
  expect(xml).toContain(`/productos/${SEED_PRODUCT.slug}<`);
  expect(xml).toContain(`/productos/${SEED_PACK.slug}<`);
  expect(xml).not.toContain("demo-empresa-borrador");
  expect(xml).not.toContain("demo-empresa-pack-borrador");
});

test("[002-AC77] /empresas fits the screen, is usable with the keyboard, has 44 px controls and no serious axe violation", async ({
  page,
}) => {
  await openEmpresas(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await noHorizontalScroll(page);
  const controls = page.getByRole("main").getByRole("link");
  const count = await controls.count();
  expect(count).toBeGreaterThan(2);
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    expect(box!.height, `link ${i}`).toBeGreaterThanOrEqual(44);
    expect(box!.width, `link ${i}`).toBeGreaterThanOrEqual(44);
  }
  const button = page.getByRole("main").getByRole("link", { name: "Cotizar por WhatsApp" });
  await button.focus();
  await expect(button).toBeFocused();
  expect(await button.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  // Every image has Spanish alt text.
  for (const img of await page.getByRole("main").locator("img").all()) {
    expect((await img.getAttribute("alt")) ?? "").not.toBe("");
  }
  expect(await seriousViolations(page)).toEqual([]);
});

test("[002-AC77] an Empresas product page fits the screen, has 44 px controls and no serious axe violation", async ({
  page,
}) => {
  await page.goto(`/productos/${SEED_PRODUCT.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: SEED_PRODUCT.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await noHorizontalScroll(page);
  for (const link of await page.getByRole("main").getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const back = page.getByRole("link", { name: "Volver a catálogo empresa" });
  await back.focus();
  await expect(back).toBeFocused();
  expect(await back.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  expect(await seriousViolations(page)).toEqual([]);
});
