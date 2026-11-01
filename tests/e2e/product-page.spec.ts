import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createTestAdmin, supabaseEnv } from "./supabase";

// Spec 002, a page per product (criteria 56 to 62, 65). Fake
// products and tiny generated PNGs, created as a throwaway admin and removed after.

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const folder = `e2e-pagina-${run}`;

type Fixture = {
  name: string;
  slug: string;
  kind?: "producto" | "pack";
  price?: number | null;
  published?: boolean;
  available?: boolean;
  description?: string | null;
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  characteristics?: string;
  photos: { path: string; alt: string }[];
};

const full: Fixture = {
  name: `Polera e2e completa ${run}`,
  slug: `e2e-completa-${run}`,
  price: 7000,
  description: "Descripción falsa de prueba.",
  colors: [
    { name: "Rosado", hex: "#E8647F" },
    { name: "Celeste", hex: "#4FB0B0" },
  ],
  sizes: ["4", "6", "8"],
  characteristics: "100% algodón\nEstampado con vinilo",
  photos: [1, 2, 3].map((n) => ({
    path: `${folder}/completa-${n}.png`,
    alt: `Foto ${n} de la polera completa de prueba`,
  })),
};
const bare: Fixture = {
  name: `Polera e2e sin datos ${run}`,
  slug: `e2e-sin-datos-${run}`,
  price: null,
  description: null,
  photos: [{ path: `${folder}/sin-datos.png`, alt: "Foto de la polera sin datos" }],
};
const unavailable: Fixture = {
  name: `Polera e2e agotada ${run}`,
  slug: `e2e-agotada-${run}`,
  available: false,
  photos: [],
};
const draft: Fixture = {
  name: `Polera e2e borrador ${run}`,
  slug: `e2e-borrador-${run}`,
  published: false,
  colors: [{ name: "Color secreto", hex: "#9565C4" }],
  photos: [{ path: `${folder}/borrador.png`, alt: "Foto oculta del borrador" }],
};
const pack: Fixture = {
  name: `Pack e2e ${run}`,
  slug: `e2e-pack-${run}`,
  kind: "pack",
  price: 14000,
  photos: [],
};
const fixtures = [full, bare, unavailable, draft, pack];

let admin: SupabaseClient;
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];

test.beforeAll(async () => {
  const created = await createTestAdmin("pagina");
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await admin.auth.signInWithPassword(created);
  if (signIn.error) throw new Error(signIn.error.message);

  for (const item of fixtures) {
    const p = await admin
      .from("product")
      .insert({
        slug: item.slug,
        name: item.name,
        kind: item.kind ?? "producto",
        price_from_clp: item.price ?? null,
        description: item.description ?? null,
        is_published: item.published ?? true,
        is_available: item.available ?? true,
        colors: item.colors ?? [],
        sizes: item.sizes ?? [],
        characteristics: item.characteristics ?? "",
      })
      .select("id")
      .single();
    if (p.error) throw new Error(p.error.message);
    productIds.push(p.data.id);
    for (const [i, photo] of item.photos.entries()) {
      const up = await admin.storage
        .from("images")
        .upload(photo.path, PNG, { contentType: "image/png" });
      if (up.error) throw new Error(up.error.message);
      const img = await admin.from("image").insert({
        storage_path: photo.path,
        alt_text: photo.alt,
        position: i + 1,
        product_id: p.data.id,
      });
      if (img.error) throw new Error(img.error.message);
    }
  }
});

test.afterAll(async () => {
  await admin.storage
    .from("images")
    .remove(fixtures.flatMap((f) => f.photos.map((p) => p.path)));
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
  await removeAdmin();
});

const PAGE_TIMEOUT = 20_000;

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function noAxeProblems(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("[002-AC56] a card has a 'Ver' link that goes to the page; pressing the photo stays", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator("article", { hasText: full.name });
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await card.scrollIntoViewIfNeeded();

  const link = card.getByRole("link", { name: `Ver ${full.name}` });
  await expect(link).toHaveAttribute("href", `/productos/${full.slug}`);
  // One action per card: no "Ver detalles" link and no WhatsApp button.
  await expect(card.getByRole("link")).toHaveCount(1);
  await expect(card.getByText("Ver detalles")).toHaveCount(0);
  await expect(card.getByText("Cotizar")).toHaveCount(0);
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);

  // Reachable with the keyboard, with a visible focus.
  await link.focus();
  await expect(link).toBeFocused();
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");

  // Pressing the photo itself does not leave the page.
  await card.getByRole("img").click();
  await expect(page).toHaveURL(/\/$/);

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/productos/${full.slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: full.name })).toBeVisible();
});

test("[002-AC56] a pack card also has the link", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("article", { hasText: pack.name });
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(
    card.getByRole("link", { name: `Ver ${pack.name}` }),
  ).toHaveAttribute("href", `/productos/${pack.slug}`);
});

test("[002-AC49] on the product page the next and previous photos are requested once the first has loaded", async ({
  page,
}) => {
  const requested = new Set<string>();
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (path.startsWith(`/img/${folder}/completa-`)) requested.add(path.slice("/img/".length));
  });
  await page.goto(`/productos/${full.slug}`);
  const photo = page.getByRole("main").getByRole("img").first();
  await expect(photo).toHaveAttribute("alt", full.photos[0].alt, { timeout: PAGE_TIMEOUT });
  // Three photos: the next and the previous are the other two.
  await expect
    .poll(() => [...requested].sort())
    .toEqual(full.photos.map((p) => p.path).sort());
  expect(await page.getByTestId("photo-counter").textContent()).toBe("1 / 3");
});

test("[002-AC57] the page shows name, price, photos, colors with names, sizes, characteristics and the quote button", async ({
  page,
}) => {
  await page.goto(`/productos/${full.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: full.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const main = page.getByRole("main");
  await expect(main.getByText("$7.000 c/u")).toBeVisible();

  // Photos with the controls of the card (criteria 46 to 50).
  await expect(main.getByTestId("photo-counter")).toHaveText("1 / 3");
  await main.getByRole("button", { name: "Foto siguiente" }).click();
  await expect(main.getByTestId("photo-counter")).toHaveText("2 / 3");
  await expect(main.getByRole("img").first()).toHaveAttribute("alt", full.photos[1].alt);

  // Colors: swatches with their names written.
  const colors = main.getByRole("region", { name: "Colores" });
  await expect(colors.getByRole("listitem")).toHaveText(["Rosado", "Celeste"]);
  await expect(colors.getByTestId("color-swatch")).toHaveCount(2);
  await expect(colors.getByTestId("color-swatch").first()).toHaveCSS(
    "background-color",
    "rgb(232, 100, 127)",
  );

  // Sizes in the order saved; characteristics one item per line.
  const sizes = main.getByRole("region", { name: "Tamaños y tallas" });
  await expect(sizes.getByRole("listitem")).toHaveText(["4", "6", "8"]);
  const traits = main.getByRole("region", { name: "Características" });
  await expect(traits.getByRole("listitem")).toHaveText(["100% algodón", "Estampado con vinilo"]);
  await expect(main.getByText("Descripción falsa de prueba.")).toBeVisible();

  // The quote button names the product as the card's does.
  const quote = main.getByRole("link", { name: "Pedir por WhatsApp" });
  const href = (await quote.getAttribute("href")) ?? "";
  expect(decodeURIComponent(href)).toContain(`Quiero cotizar: ${full.name}.`);
});

test("[002-AC58] a product with nothing to add shows no empty headings or price", async ({
  page,
}) => {
  await page.goto(`/productos/${bare.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: bare.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const main = page.getByRole("main");
  for (const heading of ["Colores", "Tamaños y tallas", "Características"]) {
    await expect(main.getByRole("heading", { name: heading })).toHaveCount(0);
  }
  await expect(main.getByText(/\$\d/)).toHaveCount(0);
  await expect(main.getByRole("img")).toHaveAttribute("alt", bare.photos[0].alt);
  await expect(main.getByRole("link", { name: "Pedir por WhatsApp" })).toBeVisible();
});

test("[002-AC59] an unavailable product says so and has no quote button", async ({ page }) => {
  await page.goto(`/productos/${unavailable.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: unavailable.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  const main = page.getByRole("main");
  await expect(main.getByText("no disponible por ahora")).toBeVisible();
  await expect(main.getByRole("link", { name: "Pedir por WhatsApp" })).toHaveCount(0);

  // Its card still shows "Ver" so the page can be opened.
  await page.goto("/");
  const card = page.locator("article", { hasText: unavailable.name });
  await expect(card).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(card.getByText("no disponible por ahora")).toBeVisible();
  await expect(card.getByRole("link", { name: `Ver ${unavailable.name}` })).toHaveAttribute(
    "href",
    `/productos/${unavailable.slug}`,
  );
});

test("[002-AC60] an unpublished or unknown slug is a 404 with none of its data", async ({
  page,
  request,
}) => {
  for (const slug of [draft.slug, `no-existe-${run}`]) {
    const response = await request.get(`/productos/${slug}`);
    expect(response.status(), slug).toBe(404);
    const html = await response.text();
    expect(html).not.toContain(draft.name);
    expect(html).not.toContain("Color secreto");
  }
  await page.goto(`/productos/${draft.slug}`);
  await expect(page.getByText(draft.name)).toHaveCount(0);
  await expect(page.getByText("Color secreto")).toHaveCount(0);

  // The unpublished photo is refused (criterion 25).
  const photo = await request.get(`/img/${draft.photos[0].path}`);
  expect(photo.status()).toBe(404);
});

test("[002-AC61] the page has its title, description, canonical and Open Graph tags", async ({
  page,
  baseURL,
}) => {
  await page.goto(`/productos/${full.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: full.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page).toHaveTitle(`${full.name} | Marcando Ando`);
  const meta = (selector: string) => page.locator(selector).first().getAttribute("content");
  const url = `${baseURL}/productos/${full.slug}`;
  expect(await meta('meta[name="description"]')).toContain("$7.000 c/u");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe(url);
  expect(await meta('meta[property="og:title"]')).toBe(`${full.name} | Marcando Ando`);
  expect(await meta('meta[property="og:description"]')).toContain("$7.000 c/u");
  expect(await meta('meta[property="og:url"]')).toBe(url);
  expect(await meta('meta[property="og:image"]')).toBe(`${baseURL}/img/${full.photos[0].path}`);
});

test("[002-AC61] with no photo, there is no og:image", async ({ page }) => {
  await page.goto(`/productos/${unavailable.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: unavailable.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
});

test("[002-AC61] the sitemap lists published product pages and no unpublished one", async ({
  request,
  baseURL,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml).toContain(`${baseURL}/productos/${full.slug}</loc>`);
  expect(xml).toContain(`${baseURL}/productos/${pack.slug}</loc>`);
  expect(xml).not.toContain(draft.slug);
});

test("[002-AC62] the public page has no 'Copiar enlace' button or link field, and the quote button is still there", async ({
  page,
}) => {
  await page.goto(`/productos/${full.slug}`);
  await expect(page.getByRole("link", { name: /Pedir por WhatsApp/ })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("button", { name: /Copiar enlace/ })).toHaveCount(0);
  await expect(page.getByText(/Copiar enlace|Enlace copiado/)).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("[002-AC65] the page has no horizontal scroll, Spanish text, nothing for axe, and the back link leads to the section", async ({
  page,
}) => {
  await page.goto(`/productos/${full.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: full.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await noHorizontalScroll(page);
  await noAxeProblems(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  // Every control is at least 44 by 44 px.
  const small: string[] = [];
  for (const control of await page
    .getByRole("main")
    .locator("button, a, input")
    .all()) {
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    if (box && (box.height < 44 || box.width < 44)) {
      small.push(`${await control.innerText()} ${box.width}x${box.height}`);
    }
  }
  expect(small).toEqual([]);

  // Keyboard: Tab reaches the back link first, then the photo controls.
  await page.getByRole("link", { name: "Volver a productos" }).focus();
  await expect(page.getByRole("link", { name: "Volver a productos" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Foto anterior" })).toBeFocused();

  await page.getByRole("link", { name: "Volver a productos" }).click();
  await expect(page).toHaveURL(/\/#productos$/);
  await expect(page.locator("#productos")).toBeVisible({ timeout: PAGE_TIMEOUT });
});

test("[002-AC65] a pack page leads back to the packs section", async ({ page }) => {
  await page.goto(`/productos/${pack.slug}`);
  await page.getByRole("link", { name: "Volver a packs" }).click({ timeout: PAGE_TIMEOUT });
  await expect(page).toHaveURL(/\/#packs$/);
});

test("[002-AC65] a page with nothing extra also passes axe and has no horizontal scroll", async ({
  page,
}) => {
  await page.goto(`/productos/${bare.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: bare.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await noHorizontalScroll(page);
  await noAxeProblems(page);
});
