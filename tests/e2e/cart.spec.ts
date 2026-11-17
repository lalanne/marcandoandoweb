import { AxeBuilder } from "@axe-core/playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createTestAdmin, refreshCatalog, supabaseEnv } from "./supabase";

// Spec 006, the shopping cart. Runs at 360 and 1280 px through the two Playwright
// projects. Fake products made as a throwaway admin and removed after; each test
// that makes a cart line stale makes its own product, so no test changes another's.

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const folder = `e2e-carrito-${run}`;
const PAGE_TIMEOUT = 20_000;
const STORAGE_KEY = "marcandoando-cart";
const WA = "https://wa.me/56982661835";

type Fixture = {
  slug: string;
  name: string;
  kind?: "producto" | "pack";
  audience?: "personas" | "empresas";
  price?: number | null;
  available?: boolean;
  description?: string | null;
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  characteristics?: string;
  photo?: boolean;
};

const full: Fixture = {
  slug: `e2e-cart-completa-${run}`,
  name: `Polera cart completa ${run}`,
  price: 7000,
  description: "Descripción falsa de prueba.",
  colors: [
    { name: "Rosado", hex: "#E8647F" },
    { name: "Celeste", hex: "#4FB0B0" },
  ],
  sizes: ["4", "6"],
  characteristics: "100% algodón\nEstampado con vinilo",
  photo: true,
};
const plain: Fixture = {
  slug: `e2e-cart-simple-${run}`,
  name: `Botella cart simple ${run}`,
  price: 7900,
  photo: true,
};
const noPrice: Fixture = {
  slug: `e2e-cart-sin-precio-${run}`,
  name: `Estuche cart sin precio ${run}`,
  price: null,
};
const noPriceTwo: Fixture = {
  slug: `e2e-cart-sin-precio-2-${run}`,
  name: `Gorro cart sin precio ${run}`,
  price: null,
};
const pack: Fixture = {
  slug: `e2e-cart-pack-${run}`,
  name: `Pack cart ${run}`,
  kind: "pack",
  price: 14000,
};
const unavailable: Fixture = {
  slug: `e2e-cart-agotado-${run}`,
  name: `Calcetines cart agotados ${run}`,
  available: false,
};
const company: Fixture = {
  slug: `e2e-cart-empresa-${run}`,
  name: `Polera cart empresa ${run}`,
  audience: "empresas",
};

let admin: SupabaseClient;
let ADMIN: { email: string; password: string };
let removeAdmin: () => Promise<void>;
const productIds: string[] = [];
const photoPaths: string[] = [];

async function insertProduct(f: Fixture): Promise<string> {
  const p = await admin
    .from("product")
    .insert({
      slug: f.slug,
      name: f.name,
      kind: f.kind ?? "producto",
      audience: f.audience ?? "personas",
      price_from_clp: f.price ?? null,
      description: f.description ?? null,
      is_published: true,
      is_available: f.available ?? true,
      colors: f.colors ?? [],
      sizes: f.sizes ?? [],
      characteristics: f.characteristics ?? "",
    })
    .select("id")
    .single();
  if (p.error) throw new Error(p.error.message);
  productIds.push(p.data.id);
  if (f.photo) {
    const path = `${folder}/${f.slug}.png`;
    const up = await admin.storage.from("images").upload(path, PNG, { contentType: "image/png" });
    if (up.error) throw new Error(up.error.message);
    photoPaths.push(path);
    const img = await admin.from("image").insert({
      storage_path: path,
      alt_text: `Foto de ${f.name}`,
      position: 1,
      product_id: p.data.id,
    });
    if (img.error) throw new Error(img.error.message);
  }
  return p.data.id;
}

test.beforeAll(async () => {
  const created = await createTestAdmin("carrito");
  ADMIN = created;
  removeAdmin = created.remove;
  const { url, anonKey } = supabaseEnv();
  admin = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await admin.auth.signInWithPassword(created);
  if (signIn.error) throw new Error(signIn.error.message);
  for (const f of [full, plain, noPrice, noPriceTwo, pack, unavailable, company]) {
    await insertProduct(f);
  }
  await refreshCatalog(ADMIN);
});

test.afterAll(async () => {
  await admin.storage.from("images").remove(photoPaths);
  for (const id of productIds) await admin.from("product").delete().eq("id", id);
  await refreshCatalog(ADMIN);
  await removeAdmin();
});

// --- helpers ---

type Stored = {
  slug: string;
  color: string | null;
  size: string | null;
  quantity: number;
  personalization: string;
};
const stored = (f: Fixture, over: Partial<Stored> = {}): Stored => ({
  slug: f.slug,
  color: f.colors?.[0]?.name ?? null,
  size: f.sizes?.[0] ?? null,
  quantity: 1,
  personalization: "",
  ...over,
});

// Puts a cart in the browser's storage and loads /carrito with it.
async function openCartWith(page: Page, items: Stored[], sent = false) {
  await page.goto("/carrito");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ version: 1, items, sent })],
  );
  await page.reload();
}

function headerCart(page: Page) {
  return page.locator("header").getByRole("link", { name: /^Carrito/ });
}

async function storedCart(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

async function openProduct(page: Page, f: Fixture) {
  await page.goto(`/productos/${f.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: f.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
}

function box(page: Page) {
  return page.getByRole("region", { name: "Arma tu pedido" });
}

function colorGroup(page: Page) {
  return box(page).getByRole("group", { name: /^Color/ });
}
function sizeGroup(page: Page) {
  return box(page).getByRole("group", { name: /^Talla o tamaño/ });
}
function quantityInput(scope: Locator) {
  return scope.getByRole("textbox", { name: "Cantidad" });
}
function personalization(page: Page) {
  return box(page).getByLabel("Personalización (opcional)");
}
function addButton(page: Page) {
  return box(page).getByRole("button", { name: "Agregar al carrito" });
}

// Chooses on the product page and adds.
async function addFromPage(
  page: Page,
  f: Fixture,
  o: { color?: string; size?: string; quantity?: string; text?: string } = {},
) {
  await openProduct(page, f);
  await expect(box(page)).toBeVisible();
  if (o.color) await colorGroup(page).getByRole("button", { name: o.color }).click();
  if (o.size) await sizeGroup(page).getByRole("button", { name: o.size, exact: true }).click();
  if (o.quantity) await quantityInput(box(page)).fill(o.quantity);
  if (o.text) await personalization(page).fill(o.text);
  await addButton(page).click();
  await expect(page.getByRole("status").filter({ hasText: "Agregado al carrito" })).toBeVisible();
}

function line(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

function sendLink(page: Page) {
  return page.getByRole("link", { name: "Enviar pedido por WhatsApp" });
}

async function messageOf(link: Locator): Promise<string> {
  const href = (await link.getAttribute("href")) ?? "";
  expect(href.startsWith(`${WA}?text=`)).toBe(true);
  return new URL(href).searchParams.get("text") ?? "";
}

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

// --- Adding to the cart ---

test("[006-AC1] the product page has the 'Arma tu pedido' box after the description, then a white 'Pedir por WhatsApp' with its message unchanged", async ({
  page,
}) => {
  await openProduct(page, full);
  const b = box(page);
  await expect(b).toBeVisible();
  await expect(b.getByRole("heading", { name: "Arma tu pedido" })).toBeVisible();
  await expect(colorGroup(page).getByRole("button")).toHaveCount(2);
  await expect(sizeGroup(page).getByRole("button")).toHaveCount(2);
  await expect(quantityInput(b)).toHaveValue("1");
  await expect(personalization(page)).toBeVisible();
  await expect(b.getByText("0 de 200")).toBeVisible();
  await expect(addButton(page)).toBeVisible();

  const quote = page.getByRole("main").getByRole("link", { name: "Pedir por WhatsApp" });
  const question = page.getByText("¿Solo quieres este producto?");
  const y = async (l: Locator) => (await l.boundingBox())!.y;
  const traits = page.getByRole("region", { name: "Características" });
  const description = page.getByText("Descripción falsa de prueba.");
  expect(await y(traits)).toBeLessThan(await y(description));
  expect(await y(description)).toBeLessThan(await y(b));
  expect(await y(b)).toBeLessThan(await y(question));
  expect(await y(question)).toBeLessThan(await y(quote));

  await expect(quote).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const href = (await quote.getAttribute("href")) ?? "";
  expect(new URL(href).searchParams.get("text")).toBe(
    `Hola, Marcando Ando. Quiero cotizar: ${full.name}. Te cuento mi idea:`,
  );
});

test("[006-AC2] pressing 'Agregar al carrito' with no color or size shows an error for each, focuses the first and adds nothing", async ({
  page,
}) => {
  await openProduct(page, full);
  await addButton(page).click();
  await expect(box(page).getByText("Elige un color.")).toBeVisible();
  await expect(box(page).getByText("Elige una talla o un tamaño.")).toBeVisible();
  await expect(colorGroup(page).getByRole("button").first()).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Agregado al carrito" })).toHaveCount(0);
  expect(await storedCart(page)).toBeNull();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");

  // With a color chosen only the size is missing, and focus goes to it.
  await colorGroup(page).getByRole("button", { name: "Rosado" }).click();
  await addButton(page).click();
  await expect(box(page).getByText("Elige un color.")).toHaveCount(0);
  await expect(box(page).getByText("Elige una talla o un tamaño.")).toBeVisible();
  await expect(sizeGroup(page).getByRole("button").first()).toBeFocused();
});

test("[006-AC3] adding Rosado, 6, quantity 2 and 'Sofía' confirms politely, counts 2 and keeps the choices", async ({
  page,
}) => {
  await openProduct(page, full);
  await colorGroup(page).getByRole("button", { name: "Rosado" }).click();
  await expect(colorGroup(page).getByRole("button", { name: "Rosado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await sizeGroup(page).getByRole("button", { name: "6", exact: true }).click();
  await quantityInput(box(page)).fill("2");
  await personalization(page).fill("Sofía");
  await expect(box(page).getByText("5 de 200")).toBeVisible();
  await addButton(page).click();

  const done = page.getByRole("status").filter({ hasText: "Agregado al carrito" });
  await expect(done).toBeVisible();
  await expect(done).toHaveAttribute("aria-live", "polite");
  await expect(done.getByRole("link", { name: "Ver carrito" })).toHaveAttribute("href", "/carrito");
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 2 productos");
  await expect(page).toHaveURL(new RegExp(`/productos/${full.slug}$`));
  await expect(colorGroup(page).getByRole("button", { name: "Rosado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(sizeGroup(page).getByRole("button", { name: "6", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(quantityInput(box(page))).toHaveValue("2");
  await expect(personalization(page)).toHaveValue("Sofía");
  expect(JSON.parse((await storedCart(page)) ?? "null")).toEqual({
    version: 1,
    items: [
      { slug: full.slug, color: "Rosado", size: "6", quantity: 2, personalization: "Sofía" },
    ],
    sent: false,
  });
});

test("[006-AC4] a product with no colors or sizes shows neither choice and is added with only a quantity", async ({
  page,
}) => {
  await openProduct(page, plain);
  await expect(box(page)).toBeVisible();
  await expect(colorGroup(page)).toHaveCount(0);
  await expect(sizeGroup(page)).toHaveCount(0);
  await addButton(page).click();
  await expect(page.getByRole("status").filter({ hasText: "Agregado al carrito" })).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
  expect(JSON.parse((await storedCart(page)) ?? "null").items).toEqual([
    { slug: plain.slug, color: null, size: null, quantity: 1, personalization: "" },
  ]);
});

test("[006-AC5] the same item adds to one line; a different color, size or personalization is a new line", async ({
  page,
}) => {
  await addFromPage(page, full, { color: "Rosado", size: "6", quantity: "2", text: "Sofía" });
  await quantityInput(box(page)).fill("3");
  await addButton(page).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 5 productos");
  expect(JSON.parse((await storedCart(page)) ?? "null").items).toHaveLength(1);

  await colorGroup(page).getByRole("button", { name: "Celeste" }).click();
  await addButton(page).click();
  await sizeGroup(page).getByRole("button", { name: "4", exact: true }).click();
  await addButton(page).click();
  await personalization(page).fill("Otra");
  await addButton(page).click();
  const items = JSON.parse((await storedCart(page)) ?? "null").items;
  expect(items).toHaveLength(4);
  expect(items[0].quantity).toBe(5);

  await page.goto("/carrito");
  await expect(page.getByRole("listitem").filter({ hasText: full.name })).toHaveCount(4);
});

test("[006-AC6] an unavailable product and an Empresas item have no cart controls; without JavaScript the order button still works", async ({
  page,
  browser,
}) => {
  await openProduct(page, unavailable);
  await expect(page.getByText("no disponible por ahora")).toBeVisible();
  await expect(box(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pedir por WhatsApp" })).toHaveCount(0);
  await expect(page.getByText("¿Solo quieres este producto?")).toHaveCount(0);

  await page.goto(`/productos/${company.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: company.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(box(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pedir por WhatsApp" })).toBeVisible();

  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const bare = await context.newPage();
    await bare.goto(`/productos/${full.slug}`);
    await expect(bare.getByRole("heading", { level: 1, name: full.name })).toBeVisible();
    await expect(bare.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
    await expect(bare.getByText("Arma tu pedido")).toHaveCount(0);
    const quote = bare.getByRole("link", { name: "Pedir por WhatsApp" });
    await expect(quote).toBeVisible();
    const href = (await quote.getAttribute("href")) ?? "";
    expect(new URL(href).searchParams.get("text")).toContain(`Quiero cotizar: ${full.name}.`);
  } finally {
    await context.close();
  }
});

test("[006-AC7] going past a limit shows a Spanish message and the cart does not change", async ({
  page,
}) => {
  // Personalization of 201 characters.
  await openProduct(page, plain);
  await expect(box(page)).toBeVisible();
  await personalization(page).fill("a".repeat(201));
  await expect(box(page).getByText("201 de 200")).toBeVisible();
  await addButton(page).click();
  await expect(
    box(page).getByText("La personalización puede tener hasta 200 caracteres."),
  ).toBeVisible();
  expect(await storedCart(page)).toBeNull();
  await personalization(page).fill("a".repeat(200));
  await addButton(page).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");

  // The sum of a line's quantity may not pass 999.
  await personalization(page).fill("");
  await quantityInput(box(page)).fill("999");
  await addButton(page).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1000 productos");
  await addButton(page).click();
  await expect(
    box(page).getByText("No se pueden agregar más de 999 unidades de un mismo producto."),
  ).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1000 productos");

  // 20 lines.
  const twenty = Array.from({ length: 20 }, (_, n) =>
    stored(plain, { personalization: `línea ${n + 1}` }),
  );
  await openCartWith(page, twenty);
  await openProduct(page, plain);
  await expect(box(page)).toBeVisible();
  await personalization(page).fill("una más");
  await addButton(page).click();
  await expect(
    box(page).getByText("Tu carrito ya tiene 20 productos distintos. Quita alguno para agregar otro."),
  ).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 20 productos");
  expect(JSON.parse((await storedCart(page)) ?? "null").items).toHaveLength(20);
});

// --- Header ---

test("[006-AC8] the people's pages have the cart link with the count of every line, with no layout shift and no horizontal scroll", async ({
  page,
  browser,
}) => {
  const items = [
    stored(full, { quantity: 2 }),
    stored(plain, { quantity: 1 }),
    // A line for a product that is not in the catalog still counts.
    { slug: `ya-no-existe-${run}`, color: null, size: null, quantity: 4, personalization: "" },
  ];
  await openCartWith(page, items);
  for (const path of ["/", "/?coleccion=navidad", `/productos/${full.slug}`, "/carrito"]) {
    await page.goto(path);
    const link = headerCart(page);
    await expect(link, path).toHaveAccessibleName("Carrito, 7 productos");
    await expect(link, path).toHaveAttribute("href", "/carrito");
    await expect(link.getByText("7", { exact: true }), path).toBeVisible();
    await noHorizontalScroll(page);
  }

  // The header is as tall with the count as it is without JavaScript (no count).
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const bare = await context.newPage();
    for (const path of ["/", "/carrito"]) {
      await bare.goto(path);
      const withoutCount = (await bare.locator("header").boundingBox())!.height;
      await page.goto(path);
      await expect(headerCart(page)).toHaveAccessibleName("Carrito, 7 productos");
      const withCount = (await page.locator("header").boundingBox())!.height;
      expect(withCount, path).toBe(withoutCount);
    }
  } finally {
    await context.close();
  }

  // On a phone the button is on the logo's row, not wrapped under the menu.
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.goto("/");
    const logo = page.locator("header").getByRole("img", { name: /Marcando Ando, logo con una polera/ });
    const logoBox = (await logo.boundingBox())!;
    const cartBox = (await headerCart(page).boundingBox())!;
    expect(cartBox.y).toBeLessThan(logoBox.y + logoBox.height);
    expect(cartBox.y + cartBox.height).toBeGreaterThan(logoBox.y);
  }

  // Empty cart and one unit.
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  await expect(headerCart(page).getByText(/\d/)).toHaveCount(0);
  await openCartWith(page, [stored(plain)]);
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
  const box48 = (await headerCart(page).boundingBox())!;
  expect(box48.width).toBeGreaterThanOrEqual(44);
  expect(box48.height).toBeGreaterThanOrEqual(44);
});

test("[006-AC9] the company pages, the sign-in page and the panel have no cart link", async ({
  page,
}) => {
  await openCartWith(page, [stored(plain)]);
  await page.goto("/empresas");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: PAGE_TIMEOUT });
  await expect(page.getByRole("link", { name: /^Carrito/ })).toHaveCount(0);
  await page.goto(`/productos/${company.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: company.name })).toBeVisible({
    timeout: PAGE_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: /^Carrito/ })).toHaveCount(0);
  await page.goto("/entrar");
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Carrito/ })).toHaveCount(0);

  await page.getByLabel("Correo").fill(ADMIN.email);
  await page.getByLabel("Contraseña").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("link", { name: /^Carrito/ })).toHaveCount(0);
});

// --- The cart page ---

test("[006-AC10] an empty cart says so, links to the products and has no total or send button", async ({
  page,
}) => {
  await page.goto("/carrito");
  await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver productos" })).toHaveAttribute(
    "href",
    "/#productos",
  );
  await expect(page.getByText(/Total/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Enviar pedido por WhatsApp" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Vaciar carrito" })).toHaveCount(0);
});

test("[006-AC11] each line shows the photo, the name as a link, the choices, the personalization, the price, the subtotal, a quantity control and Quitar", async ({
  page,
}) => {
  await openCartWith(page, [
    stored(full, { color: "Celeste", size: "4", quantity: 2, personalization: "Sofía" }),
    stored(noPrice, { quantity: 3 }),
  ]);
  const priced = line(page, full.name);
  await expect(priced.getByRole("img")).toHaveAttribute("alt", `Foto de ${full.name}`);
  await expect(priced.getByRole("link", { name: full.name })).toHaveAttribute(
    "href",
    `/productos/${full.slug}`,
  );
  await expect(priced).toContainText("Celeste");
  await expect(priced).toContainText("Talla: 4");
  await expect(priced).toContainText("Sofía");
  await expect(priced).toContainText("$7.000 c/u");
  await expect(priced).toContainText("$14.000");
  await expect(quantityInput(priced)).toHaveValue("2");
  await expect(priced.getByRole("button", { name: /^Una menos/ })).toBeEnabled();
  await expect(priced.getByRole("button", { name: /^Una más/ })).toBeEnabled();
  await expect(priced.getByRole("button", { name: /^Quitar/ })).toBeVisible();

  const unpriced = line(page, noPrice.name);
  await expect(unpriced).toContainText("Precio por cotizar");
  await expect(unpriced).toContainText("Por cotizar");
  await expect(unpriced).not.toContainText("c/u");
  await expect(unpriced).not.toContainText("Color");
  await expect(unpriced).not.toContainText("Talla");
});

test("[006-AC12] − and + and Quitar update the line, the subtotal, the total and the header at once; removing the last line shows the empty cart", async ({
  page,
}) => {
  await openCartWith(page, [stored(full, { quantity: 2 }), stored(plain, { quantity: 1 })]);
  const l = line(page, full.name);
  await expect(page.getByText("Total: $21.900")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 3 productos");

  await l.getByRole("button", { name: /^Una más/ }).click();
  await expect(quantityInput(l)).toHaveValue("3");
  await expect(l).toContainText("$21.000");
  await expect(page.getByText("Total: $28.900")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 4 productos");

  await l.getByRole("button", { name: /^Una menos/ }).click();
  await l.getByRole("button", { name: /^Una menos/ }).click();
  await expect(quantityInput(l)).toHaveValue("1");
  await expect(l.getByRole("button", { name: /^Una menos/ })).toBeDisabled();
  await expect(page.getByText("Total: $14.900")).toBeVisible();

  await l.getByRole("button", { name: /^Quitar/ }).click();
  await expect(l).toHaveCount(0);
  await expect(page.getByText("Total: $7.900")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");

  await line(page, plain.name).getByRole("button", { name: /^Quitar/ }).click();
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
});

test("[006-AC13] 'Vaciar carrito' asks for confirmation: cancelling changes nothing, confirming empties the cart", async ({
  page,
}) => {
  await openCartWith(page, [stored(full, { quantity: 2 })]);
  const messages: string[] = [];
  page.once("dialog", async (dialog) => {
    messages.push(dialog.message());
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Vaciar carrito" }).click();
  await expect(line(page, full.name)).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 2 productos");

  page.once("dialog", async (dialog) => {
    messages.push(dialog.message());
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Vaciar carrito" }).click();
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  expect(messages).toEqual([
    "¿Vaciar el carrito? Se quitan todos los productos.",
    "¿Vaciar el carrito? Se quitan todos los productos.",
  ]);
});

test("[006-AC14] the cart survives a reload; damaged data or blocked storage gives an empty cart and no errors", async ({
  page,
  browser,
}) => {
  await openCartWith(page, [stored(full, { quantity: 2, personalization: "Sofía" })]);
  await page.reload();
  await expect(line(page, full.name)).toContainText("Sofía");
  await expect(quantityInput(line(page, full.name))).toHaveValue("2");
  await page.goto("/");
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 2 productos");

  // Damaged.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // A photo that is not in local storage (the seeded demo ones) is a 404, not the cart.
  page.on(
    "console",
    (m) =>
      m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()),
  );
  await page.evaluate((key) => window.localStorage.setItem(key, "{esto no es json"), STORAGE_KEY);
  for (const path of ["/", "/carrito", `/productos/${full.slug}`]) {
    await page.goto(path);
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  }
  await page.goto("/carrito");
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  expect(errors).toEqual([]);

  // Blocked storage: reading it throws.
  const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  try {
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const blocked = await context.newPage();
    const blockedErrors: string[] = [];
    blocked.on("pageerror", (e) => blockedErrors.push(e.message));
    await blocked.goto("/carrito");
    await expect(blocked.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(headerCart(blocked)).toHaveAccessibleName("Carrito, vacío");
    await openProduct(blocked, full);
    await expect(box(blocked)).toBeVisible();
    await colorGroup(blocked).getByRole("button", { name: "Rosado" }).click();
    await sizeGroup(blocked).getByRole("button", { name: "6", exact: true }).click();
    await addButton(blocked).click();
    await expect(
      box(blocked).getByText(/El carrito no se puede usar en este navegador/),
    ).toBeVisible();
    await expect(box(blocked).getByText(/Pedir por WhatsApp/)).toBeVisible();
    await expect(headerCart(blocked)).toHaveAccessibleName("Carrito, vacío");
    expect(blockedErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

// --- Total or estimate ---

test("[006-AC15] every line with a price shows 'Total: $21.900' and the discounts note", async ({
  page,
}) => {
  await openCartWith(page, [stored(full, { quantity: 2 }), stored(plain, { quantity: 1 })]);
  await expect(page.getByText("Total: $21.900")).toBeVisible();
  await expect(
    page.getByText(
      "Precios por unidad. Los descuentos por cantidad y al por mayor se conversan por WhatsApp.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Total estimado")).toHaveCount(0);
});

test("[006-AC16] one priced line and one without shows 'Total estimado: $14.000' and the singular note; two without, the plural", async ({
  page,
}) => {
  await openCartWith(page, [stored(full, { quantity: 2 }), stored(noPrice)]);
  await expect(page.getByText("Total estimado: $14.000")).toBeVisible();
  await expect(
    page.getByText(
      "Esto no es el total: 1 producto no tiene precio publicado y se cotiza por WhatsApp.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Los descuentos por cantidad y al por mayor se conversan por WhatsApp."),
  ).toBeVisible();

  await openCartWith(page, [stored(full, { quantity: 2 }), stored(noPrice), stored(noPriceTwo)]);
  await expect(page.getByText("Total estimado: $14.000")).toBeVisible();
  await expect(
    page.getByText(
      "Esto no es el total: 2 productos no tienen precio publicado y se cotizan por WhatsApp.",
    ),
  ).toBeVisible();
});

test("[006-AC17] no line with a price shows no amount, only 'El precio se cotiza por WhatsApp.'", async ({
  page,
}) => {
  await openCartWith(page, [stored(noPrice), stored(noPriceTwo, { quantity: 2 })]);
  await expect(page.getByText("El precio se cotiza por WhatsApp.")).toBeVisible();
  await expect(page.getByText("Total")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(/\$\d/)).toHaveCount(0);
});

// --- Sending ---

test("[006-AC18] 'Enviar pedido por WhatsApp' links to wa.me with every included line and the total line of the matching case", async ({
  page,
}) => {
  await openCartWith(page, [
    stored(full, { color: "Celeste", size: "4", quantity: 2, personalization: '4°B "2026"' }),
    stored(plain, { quantity: 1 }),
  ]);
  expect(await messageOf(sendLink(page))).toBe(
    [
      "Hola, Marcando Ando. Quiero hacer este pedido:",
      "",
      `1. ${full.name}`,
      "   Color: Celeste · Talla: 4 · Cantidad: 2",
      '   Personalización: "4°B "2026""',
      "   $7.000 c/u · Subtotal: $14.000",
      "",
      `2. ${plain.name}`,
      "   Cantidad: 1",
      "   $7.900 c/u · Subtotal: $7.900",
      "",
      "Total: $21.900",
      "Las imágenes y los detalles te los mando por acá.",
    ].join("\n"),
  );

  await openCartWith(page, [stored(full, { quantity: 2 }), stored(noPrice)]);
  const estimate = await messageOf(sendLink(page));
  expect(estimate).toContain(`2. ${noPrice.name}\n   Cantidad: 1\n   Precio por cotizar`);
  expect(estimate).toContain("\nTotal estimado: $14.000 (1 producto por cotizar)\n");

  await openCartWith(page, [stored(noPrice), stored(noPriceTwo)]);
  const none = await messageOf(sendLink(page));
  expect(none).toContain("\nPrecio por cotizar\nLas imágenes");
  expect(none).not.toContain("Total");
});

test("[006-AC19] after 'Enviar' the cart keeps its lines and asks '¿Ya enviaste tu pedido?' until it changes", async ({
  page,
}) => {
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body>WhatsApp</body></html>" }),
  );
  await openCartWith(page, [stored(full, { quantity: 2 })]);
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toHaveCount(0);
  await sendLink(page).click();
  await expect(page).toHaveURL(/^https:\/\/wa\.me\//);

  await page.goto("/carrito");
  await expect(line(page, full.name)).toBeVisible();
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toBeVisible();
  await page.reload();
  await expect(line(page, full.name)).toBeVisible();
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vaciar carrito" })).toBeVisible();

  await line(page, full.name).getByRole("button", { name: /^Una más/ }).click();
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toHaveCount(0);

  // Emptying clears it too.
  await sendLink(page).click();
  await page.goto("/carrito");
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Vaciar carrito" }).click();
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await openProduct(page, plain);
  await addButton(page).click();
  await page.goto("/carrito");
  await expect(page.getByText("¿Ya enviaste tu pedido?")).toHaveCount(0);
});

// --- Stale items ---

async function makeProduct(label: string, over: Partial<Fixture> = {}): Promise<Fixture> {
  const f: Fixture = {
    slug: `e2e-cart-${label}-${run}`,
    name: `Producto cart ${label} ${run}`,
    price: 5000,
    ...over,
  };
  await insertProduct(f);
  return f;
}

async function idOf(f: Fixture): Promise<string> {
  const { data, error } = await admin.from("product").select("id").eq("slug", f.slug).single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function update(f: Fixture, values: Record<string, unknown>) {
  const { error } = await admin.from("product").update(values).eq("id", await idOf(f));
  if (error) throw new Error(error.message);
}

test("[006-AC20] a product unpublished, deleted or moved to Empresas shows as gone, with Quitar, and is left out of the total and the message", async ({
  page,
}) => {
  const keep = await makeProduct("keep-20", { price: 5000 });
  const hidden = await makeProduct("hidden-20");
  const deleted = await makeProduct("deleted-20");
  const moved = await makeProduct("moved-20");
  await update(hidden, { is_published: false });
  await update(moved, { audience: "empresas" });
  const { error } = await admin.from("product").delete().eq("id", await idOf(deleted));
  if (error) throw new Error(error.message);
  await refreshCatalog(ADMIN);

  await openCartWith(page, [
    stored(keep, { quantity: 2 }),
    stored(hidden),
    stored(deleted),
    stored(moved),
  ]);
  await expect(page.getByText("Total: $10.000")).toBeVisible();
  const gone = page.getByText("Este producto ya no está en el catálogo.");
  await expect(gone).toHaveCount(3);
  await expect(page.getByText("No se incluye en el pedido.")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Quitar/ })).toHaveCount(4);
  await expect(page.getByRole("button", { name: /^Una más/ })).toHaveCount(1);
  await expect(page.getByText("3 productos no se incluyen en el pedido")).toBeVisible();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 5 productos");
  const message = await messageOf(sendLink(page));
  expect(message).toContain(`1. ${keep.name}`);
  expect(message).not.toContain("2. ");
  expect(message).toContain("Total: $10.000");

  const dashed = await page.getByText("Este producto ya no está en el catálogo.").first().evaluate((el) => {
    let node: HTMLElement | null = el as HTMLElement;
    while (node && node.tagName !== "LI") node = node.parentElement;
    return node ? getComputedStyle(node).borderStyle : "";
  });
  expect(dashed).toBe("dashed");

  await page.getByRole("button", { name: /^Quitar/ }).nth(1).click();
  await expect(gone).toHaveCount(2);
});

test("[006-AC21] an unavailable product or a removed color or size says so and is left out; 'Enviar' counts them and is disabled when all are left out", async ({
  page,
}) => {
  const ok = await makeProduct("ok-21", { price: 5000 });
  const off = await makeProduct("off-21", { available: true });
  const colored = await makeProduct("color-21", {
    colors: [
      { name: "Rosado", hex: "#E8647F" },
      { name: "Celeste", hex: "#4FB0B0" },
    ],
  });
  const sized = await makeProduct("size-21", { sizes: ["4", "6"] });
  await update(off, { is_available: false });
  await update(colored, { colors: [{ name: "Celeste", hex: "#4FB0B0" }] });
  await update(sized, { sizes: ["4"] });
  await refreshCatalog(ADMIN);

  await openCartWith(page, [
    stored(ok),
    stored(off),
    { ...stored(colored), color: "Rosado" },
    { ...stored(sized), size: "6" },
  ]);
  await expect(page.getByText("No disponible por ahora.")).toBeVisible();
  await expect(
    page.getByText(
      "El color Rosado ya no está disponible. Quítalo y elige otro en la página del producto.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      "La talla 6 ya no está disponible. Quítala y elige otra en la página del producto.",
    ),
  ).toBeVisible();
  await expect(page.getByText("No se incluye en el pedido.")).toHaveCount(3);
  await expect(page.getByText("3 productos no se incluyen en el pedido")).toBeVisible();
  await expect(page.getByText("Total: $5.000")).toBeVisible();
  const message = await messageOf(sendLink(page));
  expect(message).toContain(`1. ${ok.name}`);
  for (const f of [off, colored, sized]) expect(message).not.toContain(f.name);

  await line(page, ok.name).getByRole("button", { name: /^Quitar/ }).click();
  await expect(page.getByText("3 productos no se incluyen en el pedido")).toBeVisible();
  await expect(sendLink(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enviar pedido por WhatsApp" })).toBeDisabled();
});

test("[006-AC22] a product whose price or name the admin changes shows the new ones in the line, the total and the message", async ({
  page,
}) => {
  const f = await makeProduct("change-22", { price: 5000 });
  await refreshCatalog(ADMIN);
  await openCartWith(page, [stored(f, { quantity: 2 })]);
  await expect(page.getByText("Total: $10.000")).toBeVisible();

  const renamed = `Renombrado cart ${run}`;
  await update(f, { name: renamed, price_from_clp: 6500 });
  await refreshCatalog(ADMIN);
  await page.reload();
  const l = line(page, renamed);
  await expect(l).toContainText("$6.500 c/u");
  await expect(l).toContainText("$13.000");
  await expect(page.getByText("Total: $13.000")).toBeVisible();
  const message = await messageOf(sendLink(page));
  expect(message).toContain(`1. ${renamed}`);
  expect(message).toContain("$6.500 c/u · Subtotal: $13.000");

  // The price removed: the line is "por cotizar", still sent.
  await update(f, { price_from_clp: null });
  await refreshCatalog(ADMIN);
  await page.reload();
  await expect(line(page, renamed)).toContainText("Precio por cotizar");
  await expect(page.getByText("El precio se cotiza por WhatsApp.")).toBeVisible();
});

// --- Privacy, accessibility, indexing ---

test("[006-AC24] adding, changing and sending items sends the cart's contents to no server, only to the WhatsApp link", async ({
  page,
}) => {
  const secret = `SecretoPersonal${run}`;
  const seen: { url: string; body: string; headers: string }[] = [];
  page.on("request", (req) =>
    seen.push({
      url: req.url(),
      body: req.postData() ?? "",
      headers: JSON.stringify(req.headers()),
    }),
  );
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body>WhatsApp</body></html>" }),
  );

  await addFromPage(page, full, { color: "Rosado", size: "6", quantity: "3", text: secret });
  await page.goto("/carrito");
  await line(page, full.name).getByRole("button", { name: /^Una más/ }).click();
  await expect(quantityInput(line(page, full.name))).toHaveValue("4");
  await sendLink(page).click();
  await expect(page).toHaveURL(/^https:\/\/wa\.me\//);

  const others = seen.filter((r) => !r.url.startsWith(WA));
  expect(others.length).toBeGreaterThan(0);
  for (const r of others) {
    const everything = decodeURIComponent(`${r.url}${r.body}${r.headers}`);
    expect(everything, r.url).not.toContain(secret);
    expect(everything, r.url).not.toContain("Rosado");
  }
  const whatsapp = seen.filter((r) => r.url.startsWith(WA));
  expect(whatsapp).toHaveLength(1);
  expect(decodeURIComponent(whatsapp[0].url)).toContain(secret);
  // Nothing is kept in a cookie either.
  expect((await page.context().cookies()).map((c) => c.value).join(" ")).not.toContain(secret);
});

test("[006-AC25] the product page controls and the cart page work with the keyboard only, with visible focus, 44 px targets, no serious axe problems and no horizontal scroll", async ({
  page,
}, testInfo) => {
  await openProduct(page, full);
  await expect(box(page)).toBeVisible();
  await noHorizontalScroll(page);
  await noAxeProblems(page);
  await page.screenshot({
    path: testInfo.outputPath(`producto-${testInfo.project.name}.png`),
    fullPage: true,
  });
  await testInfo.attach(`producto-${testInfo.project.name}`, {
    path: testInfo.outputPath(`producto-${testInfo.project.name}.png`),
    contentType: "image/png",
  });

  const focused = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim(),
        outline: getComputedStyle(el).outlineStyle,
        width: r.width,
        height: r.height,
      };
    });
  async function expectFocus(text: RegExp) {
    const now = await focused();
    expect(now?.text).toMatch(text);
    expect(now?.outline).not.toBe("none");
    expect(now?.width).toBeGreaterThanOrEqual(44);
    expect(now?.height).toBeGreaterThanOrEqual(44);
  }

  await colorGroup(page).getByRole("button").first().focus();
  await expectFocus(/Rosado/);
  await page.keyboard.press("Enter");
  await expect(colorGroup(page).getByRole("button", { name: "Rosado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Tab");
  await expectFocus(/Celeste/);
  await page.keyboard.press("Tab");
  await expectFocus(/^4$/);
  await page.keyboard.press("Tab");
  await expectFocus(/^6$/);
  await page.keyboard.press("Space");
  // "−" is disabled at 1, so the keyboard goes on to the quantity field.
  await page.keyboard.press("Tab");
  await expectFocus(/^$/);
  await page.keyboard.press("Tab");
  await expectFocus(/^Una más/);
  await page.keyboard.press("Enter");
  await expect(quantityInput(box(page))).toHaveValue("2");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Sofía");
  await page.keyboard.press("Tab");
  await expectFocus(/Agregar al carrito/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Agregado al carrito" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expectFocus(/Ver carrito/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/carrito$/);

  await expect(line(page, full.name)).toBeVisible();
  await noHorizontalScroll(page);
  await noAxeProblems(page);
  await page.screenshot({
    path: testInfo.outputPath(`carrito-${testInfo.project.name}.png`),
    fullPage: true,
  });
  await testInfo.attach(`carrito-${testInfo.project.name}`, {
    path: testInfo.outputPath(`carrito-${testInfo.project.name}.png`),
    contentType: "image/png",
  });
  const controls = [
    page.getByRole("link", { name: full.name }),
    line(page, full.name).getByRole("button", { name: /^Una menos/ }),
    quantityInput(line(page, full.name)),
    line(page, full.name).getByRole("button", { name: /^Una más/ }),
    line(page, full.name).getByRole("button", { name: /^Quitar/ }),
    sendLink(page),
    page.getByRole("button", { name: "Vaciar carrito" }),
    page.getByRole("link", { name: "← Seguir viendo productos" }),
  ];
  for (const control of controls) {
    await control.focus();
    await expect(control).toBeFocused();
    const style = await control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { outline: getComputedStyle(el).outlineStyle, w: r.width, h: r.height };
    });
    expect(style.outline).not.toBe("none");
    expect(style.w).toBeGreaterThanOrEqual(44);
    expect(style.h).toBeGreaterThanOrEqual(44);
  }
});

test("[006-AC25] the cart page with stale and unpriced lines has no serious axe problems at this width", async ({
  page,
}) => {
  await openCartWith(page, [
    stored(full, { personalization: "Sofía" }),
    stored(noPrice),
    { slug: `ya-no-existe-${run}`, color: null, size: null, quantity: 1, personalization: "" },
  ]);
  await expect(page.getByText("Este producto ya no está en el catálogo.")).toBeVisible();
  await noHorizontalScroll(page);
  await noAxeProblems(page);
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  await noAxeProblems(page);
});

test("[006-AC26] /carrito is not in the sitemap and has noindex", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/carrito");
  await page.goto("/carrito");
  await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
});

// --- Second round ---

test("[006-AC27] a quantity typed on the product page or on a cart line is checked: 5 is taken; 0, 1000, 'dos' and empty show the message and change nothing", async ({
  page,
}) => {
  const message = "Escribe una cantidad entre 1 y 999.";
  await openProduct(page, plain);
  await expect(box(page)).toBeVisible();
  const q = quantityInput(box(page));
  await q.fill("5");
  await expect(box(page).getByText(message)).toHaveCount(0);
  await addButton(page).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 5 productos");

  for (const bad of ["0", "1000", "dos", ""]) {
    await q.fill(bad);
    await expect(box(page).getByText(message), bad).toBeVisible();
    await addButton(page).click();
    await expect(headerCart(page), bad).toHaveAccessibleName("Carrito, 5 productos");
    expect(JSON.parse((await storedCart(page)) ?? "null").items[0].quantity).toBe(5);
  }
  await q.fill("2");
  await expect(box(page).getByText(message)).toHaveCount(0);
  await expect(box(page).getByRole("button", { name: /^Una menos/ })).toBeEnabled();
  await q.fill("1");
  await expect(box(page).getByRole("button", { name: /^Una menos/ })).toBeDisabled();

  // On a cart line.
  await page.goto("/carrito");
  const l = line(page, plain.name);
  const lq = quantityInput(l);
  await lq.fill("7");
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 7 productos");
  await expect(l).toContainText("$55.300");
  for (const bad of ["0", "1000", "dos", ""]) {
    await lq.fill(bad);
    await expect(l.getByText(message), bad).toBeVisible();
    await expect(headerCart(page), bad).toHaveAccessibleName("Carrito, 7 productos");
  }
  await lq.fill("3");
  await expect(l.getByText(message)).toHaveCount(0);
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 3 productos");
});

test("[006-AC28] a change in one tab shows in the other tab's header and cart page without a reload", async ({
  page,
  context,
}) => {
  await openCartWith(page, [stored(plain)]);
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
  const other = await context.newPage();
  await addFromPage(other, full, { color: "Rosado", size: "6", quantity: "2" });

  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 3 productos");
  await expect(line(page, full.name)).toBeVisible();

  await other.goto("/carrito");
  await quantityInput(line(other, full.name)).fill("5");
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 6 productos");
  await expect(quantityInput(line(page, full.name))).toHaveValue("5");

  await line(other, full.name).getByRole("button", { name: /^Quitar/ }).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
  await expect(line(page, full.name)).toHaveCount(0);
  await other.close();
});

test("[006-AC29] a stored cart with an unknown version or an invalid shape is empty, shows no error, and adding stores a valid cart", async ({
  page,
}) => {
  await page.goto("/carrito");
  const bad = [
    JSON.stringify({ version: 99, items: [stored(plain)], sent: false }),
    JSON.stringify({ items: [stored(plain)], sent: false }),
    JSON.stringify({ version: 1, items: [{ ...stored(plain), quantity: -2 }], sent: false }),
    JSON.stringify({ version: 1, items: "no", sent: false }),
  ];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const value of bad) {
    await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, value]);
    await page.reload();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  }
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [STORAGE_KEY, bad[0]]);
  await openProduct(page, plain);
  await expect(box(page)).toBeVisible();
  await addButton(page).click();
  await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
  expect(JSON.parse((await storedCart(page)) ?? "null")).toEqual({
    version: 1,
    items: [{ slug: plain.slug, color: null, size: null, quantity: 1, personalization: "" }],
    sent: false,
  });
  expect(errors).toEqual([]);
});
