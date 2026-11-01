import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN, supabaseEnv } from "./supabase";

// Spec 002, all of a product's photos on its card (criteria 46 to 51, issue #82).
// Fake products and tiny generated PNGs, created as the admin and removed after.

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const folder = `e2e-fotos-${run}`;
const many = {
  name: `Producto e2e cuatro fotos ${run}`,
  slug: `e2e-cuatro-${run}`,
  published: true,
  photos: [1, 2, 3, 4].map((n) => ({
    path: `${folder}/cuatro-${n}.png`,
    alt: `Foto ${n} de prueba del producto con cuatro fotos`,
  })),
};
const one = {
  name: `Producto e2e una foto ${run}`,
  slug: `e2e-una-${run}`,
  published: true,
  photos: [{ path: `${folder}/una.png`, alt: "Única foto de prueba" }],
};
const draft = {
  name: `Producto e2e borrador fotos ${run}`,
  slug: `e2e-borrador-fotos-${run}`,
  published: false,
  photos: [1, 2].map((n) => ({ path: `${folder}/borrador-${n}.png`, alt: "Foto oculta" })),
};
const fixtures = [many, one, draft];

let admin: SupabaseClient;
const productIds: string[] = [];

test.beforeAll(async () => {
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await admin.auth.signInWithPassword(ADMIN);
  if (signIn.error) throw new Error(signIn.error.message);

  for (const item of fixtures) {
    const p = await admin
      .from("product")
      .insert({ slug: item.slug, name: item.name, is_published: item.published })
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
});

async function cardOf(page: Page, name: string): Promise<Locator> {
  await page.goto("/");
  const card = page.locator("article", { hasText: name });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await card.scrollIntoViewIfNeeded();
  return card;
}

const photo = (card: Locator) => card.getByRole("img");
const counter = (card: Locator) => card.getByTestId("photo-counter");
const next = (card: Locator) => card.getByRole("button", { name: "Foto siguiente" });
const previous = (card: Locator) => card.getByRole("button", { name: "Foto anterior" });
const dots = (card: Locator) => card.getByRole("button", { name: /^Ver foto \d+$/ });

async function shows(card: Locator, n: number) {
  await expect(photo(card)).toHaveAttribute("alt", many.photos[n - 1].alt);
  await expect(photo(card)).toHaveAttribute("src", `/img/${many.photos[n - 1].path}`);
  await expect(counter(card)).toHaveText(`${n} / 4`);
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("[002-AC46] a card with one photo shows it with no buttons, counter or dots", async ({
  page,
}) => {
  const card = await cardOf(page, one.name);
  await expect(photo(card)).toHaveCount(1);
  await expect(photo(card)).toHaveAttribute("alt", one.photos[0].alt);
  await expect(next(card)).toHaveCount(0);
  await expect(previous(card)).toHaveCount(0);
  await expect(dots(card)).toHaveCount(0);
  await expect(counter(card)).toHaveCount(0);
  // The seeded single-photo product keeps its card as before too.
  const botella = page.locator("article", { hasText: "Botella de ejemplo" });
  await expect(botella.getByRole("button", { name: /Foto|Ver foto/ })).toHaveCount(0);
});

test("[002-AC47] a card with four photos moves with the buttons and the dots, and goes round", async ({
  page,
}) => {
  const card = await cardOf(page, many.name);
  await shows(card, 1);
  await expect(next(card)).toBeVisible();
  await expect(previous(card)).toBeVisible();
  await expect(dots(card)).toHaveCount(4);
  await expect(dots(card).nth(0)).toHaveAttribute("aria-current", "true");

  await next(card).click();
  await shows(card, 2);

  await card.getByRole("button", { name: "Ver foto 3" }).click();
  await shows(card, 3);
  await expect(card.getByRole("button", { name: "Ver foto 3" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(dots(card).nth(0)).not.toHaveAttribute("aria-current", "true");

  await next(card).click();
  await shows(card, 4);
  await next(card).click();
  await shows(card, 1);
  await previous(card).click();
  await shows(card, 4);

  // Only one photo is in the card at a time; name, price and button stay.
  await expect(photo(card)).toHaveCount(1);
  await expect(card.getByRole("link", { name: /Cotizar/ })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).include("article").analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("[002-AC48] swiping the photo sideways moves to the next or previous photo", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-360", "touch screens: the 360 px project");
  const card = await cardOf(page, many.name);
  const area = card.getByTestId("photo-area");
  const box = await area.boundingBox();
  if (!box) throw new Error("no photo area");
  const y = box.y + box.height / 2;
  const swipe = async (fromX: number, toX: number) => {
    const base = { pointerType: "touch", isPrimary: true, pointerId: 1, bubbles: true };
    await area.dispatchEvent("pointerdown", { ...base, clientX: fromX, clientY: y });
    await area.dispatchEvent("pointerup", { ...base, clientX: toX, clientY: y + 4 });
  };

  await shows(card, 1);
  // Finger to the left: the next photo.
  await swipe(box.x + box.width * 0.8, box.x + box.width * 0.2);
  await shows(card, 2);
  // Finger to the right: the previous photo.
  await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8);
  await shows(card, 1);
  // And round, as with the buttons.
  await swipe(box.x + box.width * 0.2, box.x + box.width * 0.8);
  await shows(card, 4);
  // A tap is not a swipe.
  await swipe(box.x + box.width / 2, box.x + box.width / 2 + 5);
  await shows(card, 4);
});

test("[002-AC49] only the first photo loads with the page, each photo has its alt text, and the card keeps its size", async ({
  page,
}) => {
  const requested = new Set<string>();
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (path.startsWith(`/img/${folder}/`)) requested.add(path.slice("/img/".length));
  });
  const card = await cardOf(page, many.name);
  const img = photo(card);
  await expect
    .poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  expect([...requested].filter((p) => p.startsWith(`${folder}/cuatro-`))).toEqual([
    many.photos[0].path,
  ]);

  const before = await card.boundingBox();
  const photoBefore = await card.getByTestId("photo-area").boundingBox();
  const alts: string[] = [];
  for (let n = 1; n <= 4; n++) {
    alts.push((await img.getAttribute("alt")) ?? "");
    if (n === 1) {
      await next(card).click();
      await shows(card, 2);
      // Moving to the second photo asks for it, and not yet for the others.
      await expect.poll(() => requested.has(many.photos[1].path)).toBe(true);
      expect(requested.has(many.photos[3].path)).toBe(false);
      expect(await card.boundingBox()).toEqual(before);
      expect(await card.getByTestId("photo-area").boundingBox()).toEqual(photoBefore);
      continue;
    }
    if (n < 4) await next(card).click();
  }
  expect(alts).toEqual(many.photos.map((p) => p.alt));
  expect(await card.boundingBox()).toEqual(before);
});

test("[002-AC50] the photo controls work with the keyboard, show focus, are at least 44 px and fit at 360 px", async ({
  page,
}) => {
  const card = await cardOf(page, many.name);
  const controls = [previous(card), next(card), ...[1, 2, 3, 4].map((n) => card.getByRole("button", { name: `Ver foto ${n}` }))];
  await page.keyboard.press("Tab");
  for (const control of controls) {
    await control.focus();
    await expect(control).toBeFocused();
    const focus = await control.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    });
    expect(focus).toBe(true);
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await next(card).focus();
  await page.keyboard.press("Enter");
  await shows(card, 2);
  await page.keyboard.press("Space");
  await shows(card, 3);
  await card.getByRole("button", { name: "Ver foto 1" }).focus();
  await page.keyboard.press("Enter");
  await shows(card, 1);
  await previous(card).focus();
  await page.keyboard.press("Enter");
  await shows(card, 4);

  await noHorizontalScroll(page);
});

test("[002-AC51] a visitor cannot read any photo of an unpublished product", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator("article", { hasText: many.name })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(draft.name)).toHaveCount(0);
  for (const p of draft.photos) {
    expect((await request.get(`/img/${p.path}`)).status(), p.path).toBe(404);
    await expect(page.locator(`img[src="/img/${p.path}"]`)).toHaveCount(0);
  }
  // The published product's later photos are readable.
  expect((await request.get(`/img/${many.photos[3].path}`)).status()).toBe(200);
});
