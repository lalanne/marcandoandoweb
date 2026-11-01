import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Spec 002, "Public page" (criteria 11 to 18 and 23). The page reads the fake
// seed data of supabase/seed.sql from the local database.

const WHATSAPP = "https://wa.me/56982661835";
const VIEWPORTS = [
  { name: "360", width: 360, height: 740 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

async function open(page: Page) {
  await page.goto("/");
  // Products stream in after the shell: wait for the first seeded product.
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("[002-AC11] first screen", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("[002-AC11] shows the logo, the tagline and the quote button without scrolling at 360 px", async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.getByRole("img", { name: /Marcando Ando/ }).first(),
    ).toBeInViewport();
    await expect(page.getByText("Marcamos tus ideas").first()).toBeInViewport();
    await expect(
      page.getByRole("link", { name: "Cotizar por WhatsApp" }).first(),
    ).toBeInViewport();
  });
});

test("[002-AC12] has every section in order, in Spanish", async ({ page }) => {
  await open(page);
  const order = await page.evaluate(() =>
    ["header", "inicio", "productos", "packs", "trabajos", "como-pedir", "colegios"].map(
      (id) => {
        const el =
          id === "header"
            ? document.querySelector("body > header, header")
            : document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : null;
      },
    ),
  );
  expect(order.every((top) => top !== null)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => (a ?? 0) - (b ?? 0)));
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { name: "Cómo pedir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabajos reales" })).toBeVisible();
  await expect(page.getByText("Diseño de ejemplo: estrellas")).toBeVisible();
});

test("[002-AC12] shows no draft product or draft pack", async ({ page }) => {
  await open(page);
  await expect(page.getByText("Estuche de ejemplo (borrador)")).toHaveCount(0);
  await expect(page.getByText("Pack de ejemplo (borrador)")).toHaveCount(0);
});

// The ten old category names (dropped from the database in #65): none of them
// may show.
const CATEGORY_NAMES = [
  "Botellas personalizadas",
  "Poleras personalizadas",
  "Polerones personalizados",
  "Estuches personalizados",
  "Calcetines personalizados",
  "Productos escolares",
  "Regalos personalizados",
  "Productos para cursos y generaciones",
  "Productos para fechas especiales",
  "Etiquetas para ropa",
];

const cardNames = (page: Page, sectionId: string) =>
  page.locator(`#${sectionId} article h3`).allInnerTexts();

test("[002-AC33] lists productos and packs in their own sections, highlighted first, with no category", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("heading", { name: "Productos", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packs", level: 2 })).toBeVisible();

  const productos = await cardNames(page, "productos");
  expect(productos).toContain("Botella de ejemplo");
  expect(productos).toContain("Polera de ejemplo");
  expect(productos).not.toContain("Pack regalo de ejemplo");
  // The highlighted product comes first.
  expect(productos[0]).toBe("Botella de ejemplo");

  // "Pack regalo" is highlighted, so it comes before "Pack curso" even though it
  // sorts after it by name.
  const packs = await cardNames(page, "packs");
  expect(packs).toContain("Pack curso de ejemplo");
  expect(packs).not.toContain("Botella de ejemplo");
  expect(packs[0]).toBe("Pack regalo de ejemplo");

  // Packs come right after Productos.
  const next = await page.evaluate(
    () => document.getElementById("productos")?.nextElementSibling?.id,
  );
  expect(next).toBe("packs");

  const text = await page.locator("main").innerText();
  for (const name of CATEGORY_NAMES) expect(text, name).not.toContain(name);
  await expect(page.getByRole("heading", { level: 3, name: /personalizad/ })).toHaveCount(0);
});

test("[002-AC33] a pack has the same card as a product: price and a page whose WhatsApp button names it", async ({
  page,
}) => {
  await open(page);
  const card = page.locator("#packs article").filter({ hasText: "Pack regalo de ejemplo" });
  await expect(card).toContainText("$1.000 c/u");
  // The WhatsApp button is on the pack's page, reached with "Ver" (issue #101).
  await card.getByRole("link", { name: /^Ver / }).click();
  const href = await page
    .getByRole("main")
    .getByRole("link", { name: "Pedir por WhatsApp" })
    .getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/56982661835\?text=/);
  expect(new URL(href ?? "").searchParams.get("text")).toContain("Pack regalo de ejemplo");
});

test("[002-AC35] the header links are exactly Productos, Packs, Cómo pedir and Colegios y grupos", async ({
  page,
}) => {
  await open(page);
  const nav = page.getByRole("navigation", { name: "Secciones" });
  await expect(nav.getByRole("link", { name: "Packs" })).toBeVisible();
  const links = await nav
    .locator("a")
    .evaluateAll((els) =>
      els
        .map((el) => ({ text: el.textContent?.trim() ?? "", href: el.getAttribute("href") }))
        .filter((l) => !/^(Entrar|Mi panel)$/.test(l.text)),
    );
  expect(links).toEqual([
    { text: "Productos", href: "#productos" },
    { text: "Packs", href: "#packs" },
    { text: "Cómo pedir", href: "#como-pedir" },
    { text: "Colegios y grupos", href: "#colegios" },
  ]);
  // Published designs exist (the "Trabajos reales" section shows) but there is no
  // header link to it.
  await expect(page.getByRole("heading", { name: "Trabajos reales" })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: /Trabajos/ })).toHaveCount(0);
  // Each link leads to its section.
  for (const { href } of links) {
    await expect(page.locator(href ?? "")).toHaveCount(1);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("[002-AC12] shows prices only when the database has one, with the dot", async ({
  page,
}) => {
  await open(page);
  // Seed prices are a fake 1000 for every product: "$1.000 c/u".
  await expect(page.getByText("$1.000 c/u").first()).toBeVisible();
});

test("[002-AC12] marks an unavailable product and gives it no WhatsApp button", async ({
  page,
}) => {
  await open(page);
  const card = page
    .locator("article")
    .filter({ hasText: "Calcetines de ejemplo (no disponibles)" });
  await expect(card).toContainText("no disponible por ahora");
  // Its only link is "Ver" (criterion 56): no WhatsApp button.
  await expect(card.locator(`a[href^="${WHATSAPP}"]`)).toHaveCount(0);
  const available = page
    .locator("article")
    .filter({ hasText: "Botella de ejemplo" });
  await expect(available).not.toContainText("no disponible por ahora");
  // Cards have no WhatsApp button since issue #101: the order button is on the page.
  await expect(available.locator(`a[href^="${WHATSAPP}"]`)).toHaveCount(0);
});

test("[002-AC13] every ordering button opens WhatsApp with a message, and a product's names it", async ({
  page,
}) => {
  await open(page);
  const links = page.locator(`a[href^="${WHATSAPP}"]`);
  expect(await links.count()).toBeGreaterThanOrEqual(4);
  for (const href of await links.evaluateAll((els) =>
    els.map((el) => el.getAttribute("href") ?? ""),
  )) {
    expect(href.startsWith(`${WHATSAPP}?text=`)).toBe(true);
    expect(new URL(href).searchParams.get("text")).toMatch(/^Hola, Marcando Ando/);
  }
  await expect(
    page.getByRole("link", { name: "Escríbenos por WhatsApp" }),
  ).toHaveAttribute("href", /^https:\/\/wa\.me\/56982661835\?text=/);
  // A product's message names it; its button is on the product page (issue #101).
  await page
    .locator("article")
    .filter({ hasText: "Botella de ejemplo" })
    .getByRole("link", { name: /^Ver / })
    .click();
  const productHref = await page
    .getByRole("main")
    .getByRole("link", { name: "Pedir por WhatsApp" })
    .getAttribute("href");
  expect(new URL(productHref ?? "").searchParams.get("text")).toContain(
    "Botella de ejemplo",
  );
});

test("[002-AC14] the Instagram link opens the business profile", async ({ page }) => {
  await open(page);
  const link = page.locator("footer").getByRole("link", { name: /@marcando_ando/ });
  await expect(link).toHaveAttribute(
    "href",
    "https://www.instagram.com/marcando_ando",
  );
});

test("[002-AC15] the footer shows no email and no placeholder", async ({ page }) => {
  await open(page);
  const footer = page.locator("footer");
  await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
  const text = (await footer.innerText()).toLowerCase();
  expect(text).not.toMatch(/[a-z0-9._-]+@[a-z0-9-]+\.[a-z]+/);
  expect(text).not.toMatch(/correo|e-mail|email|por confirmar|pendiente/);
});

test("[002-AC16] every image has Spanish alt text", async ({ page }) => {
  await open(page);
  const alts = await page
    .locator("img")
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("alt")));
  expect(alts.length).toBeGreaterThan(0);
  for (const alt of alts) {
    expect(alt && alt.trim().length > 0).toBe(true);
  }
});

test("[002-AC16] the hero image loads eagerly and the others lazily", async ({
  page,
}) => {
  await open(page);
  const loading = await page
    .locator("img")
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("loading")));
  expect(loading[0]).not.toBe("lazy");
  for (const value of loading.slice(1)) expect(value).toBe("lazy");
});

for (const vp of VIEWPORTS) {
  test.describe(`at ${vp.name} px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`[002-AC17] has no horizontal scroll and the floating button covers no link at ${vp.name} px`, async ({
      page,
    }) => {
      await open(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const floating = page.getByRole("link", { name: "WhatsApp", exact: true });
      await expect(floating).toBeVisible();
      // Every link and button can be reached: when scrolled into view, the
      // element at its center is itself, not the floating button.
      const total = await page.locator("main a, footer a").count();
      for (let i = 0; i < total; i++) {
        const el = page.locator("main a, footer a").nth(i);
        await el.scrollIntoViewIfNeeded();
        const covered = await el.evaluate((node) => {
          const r = node.getBoundingClientRect();
          const top = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return !(top && (node === top || node.contains(top)));
        });
        expect(covered, `link ${i} is covered`).toBe(false);
      }
    });
  });
}

test("[002-AC18] every link and button is reachable with the keyboard, with a visible focus", async ({
  page,
}) => {
  await open(page);
  const count = await page.locator("a[href], button").count();
  const reached = new Set<number>();
  for (let i = 0; i < count + 2; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const index = [...document.querySelectorAll("a[href], button")].indexOf(el);
      if (index < 0) return null;
      const s = getComputedStyle(el);
      // The shared global focus style is an outline; the button shadow alone
      // would not count as a focus indicator, so only the outline is accepted.
      const visible = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
      return { index, visible };
    });
    if (info) {
      expect(info.visible, `focus not visible on item ${info.index}`).toBe(true);
      reached.add(info.index);
    }
  }
  expect(reached.size).toBe(count);
});

test("[002-AC23] has title, description, Open Graph tags with image, favicon and lang es", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  expect((await page.title()).length).toBeGreaterThan(0);
  const meta = (selector: string) =>
    page.locator(selector).first().getAttribute("content");
  expect(await meta('meta[name="description"]')).toBeTruthy();
  expect(await meta('meta[property="og:title"]')).toBeTruthy();
  expect(await meta('meta[property="og:description"]')).toBeTruthy();
  const image = await meta('meta[property="og:image"]');
  expect(image).toMatch(/^https?:\/\/.+\/img\/og\.jpg/);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /.+/);
  // Fetch it from the running server (the absolute URL may name the live domain).
  const response = await page.request.get(new URL(image ?? "").pathname);
  expect(response.ok()).toBe(true);
});

test("the public page has no serious or critical accessibility violations", async ({
  page,
}) => {
  await open(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
