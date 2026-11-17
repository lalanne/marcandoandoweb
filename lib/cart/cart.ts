// The shopping cart's pure logic (spec 006): the stored shape and its version, the
// limits, the merge rule, typed quantities, matching stored items against the
// catalog, totals and the WhatsApp message. No browser, no environment, no network.
import { formatClp } from "../catalog/format";
import { WHATSAPP_URL } from "../catalog/whatsapp";

/** The stored format's version; an unknown one is read as a damaged cart. */
export const CART_VERSION = 1;
export const MAX_LINES = 20;
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 999;
export const MAX_PERSONALIZATION = 200;

/** What is stored per item: no name, no price (read from the catalog when shown). */
export type CartItem = {
  slug: string;
  color: string | null;
  size: string | null;
  quantity: number;
  personalization: string;
};

export type Cart = { items: CartItem[]; sent: boolean };

export function emptyCart(): Cart {
  return { items: [], sent: false };
}

// --- Spanish messages (spec 006, "Adding to the cart" and "The cart page") ---

export const QUANTITY_ERROR = "Escribe una cantidad entre 1 y 999.";
export const CART_ERRORS = {
  lines: "Tu carrito ya tiene 20 productos distintos. Quita alguno para agregar otro.",
  quantity: "No se pueden agregar más de 999 unidades de un mismo producto.",
  personalization: "La personalización puede tener hasta 200 caracteres.",
} as const;
export type CartError = keyof typeof CART_ERRORS;

// --- Stored data ---

export function serializeCart(cart: Cart): string {
  return JSON.stringify({ version: CART_VERSION, items: cart.items, sent: cart.sent });
}

function isQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_QUANTITY &&
    value <= MAX_QUANTITY
  );
}

function parseItem(value: unknown): CartItem | null {
  if (typeof value !== "object" || value === null) return null;
  const { slug, color, size, quantity, personalization } = value as Record<string, unknown>;
  if (typeof slug !== "string" || slug === "") return null;
  if (color !== null && typeof color !== "string") return null;
  if (size !== null && typeof size !== "string") return null;
  if (!isQuantity(quantity)) return null;
  if (typeof personalization !== "string" || personalization.length > MAX_PERSONALIZATION) {
    return null;
  }
  return { slug, color, size, quantity, personalization };
}

/**
 * The cart from the stored text. Nothing, damaged text, an unknown version or any
 * invalid part reads as an empty cart (criteria 14 and 29): never an error.
 */
export function parseStoredCart(raw: string | null | undefined): Cart {
  if (!raw) return emptyCart();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyCart();
  }
  if (typeof data !== "object" || data === null) return emptyCart();
  const { version, items, sent } = data as Record<string, unknown>;
  if (version !== CART_VERSION || !Array.isArray(items) || typeof sent !== "boolean") {
    return emptyCart();
  }
  if (items.length > MAX_LINES) return emptyCart();
  const parsed: CartItem[] = [];
  for (const entry of items) {
    const one = parseItem(entry);
    if (!one) return emptyCart();
    parsed.push(one);
  }
  return { items: parsed, sent };
}

// --- Operations. Each returns a new cart; any change clears the "sent" flag. ---

/** Identifies a line: two items with the same key are the same line. */
export function itemKey(item: Pick<CartItem, "slug" | "color" | "size" | "personalization">): string {
  return JSON.stringify([item.slug, item.color, item.size, item.personalization]);
}

/** A whole number from 1 to 999 typed by the visitor, or null. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return isQuantity(n) ? n : null;
}

export type AddResult = { ok: true; cart: Cart } | { ok: false; error: CartError };

/** Adds an item, merging it into the line with the same key (criteria 5 and 7). */
export function addToCart(cart: Cart, item: CartItem): AddResult {
  if (!isQuantity(item.quantity)) return { ok: false, error: "quantity" };
  if (item.personalization.length > MAX_PERSONALIZATION) {
    return { ok: false, error: "personalization" };
  }
  const key = itemKey(item);
  const at = cart.items.findIndex((existing) => itemKey(existing) === key);
  if (at === -1) {
    if (cart.items.length >= MAX_LINES) return { ok: false, error: "lines" };
    return { ok: true, cart: { items: [...cart.items, item], sent: false } };
  }
  const quantity = cart.items[at].quantity + item.quantity;
  if (quantity > MAX_QUANTITY) return { ok: false, error: "quantity" };
  const items = cart.items.map((existing, i) => (i === at ? { ...existing, quantity } : existing));
  return { ok: true, cart: { items, sent: false } };
}

/** Sets a line's quantity; a quantity outside 1 to 999 changes nothing. */
export function changeQuantity(cart: Cart, key: string, quantity: number): Cart {
  if (!isQuantity(quantity)) return cart;
  return {
    items: cart.items.map((item) => (itemKey(item) === key ? { ...item, quantity } : item)),
    sent: false,
  };
}

export function removeLine(cart: Cart, key: string): Cart {
  return { items: cart.items.filter((item) => itemKey(item) !== key), sent: false };
}

/** "Enviar" was pressed (criterion 19). */
export function markSent(cart: Cart): Cart {
  return { ...cart, sent: true };
}

/** The header's count: the sum of the quantities of every line, left-out ones too. */
export function cartCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function productsLabel(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

/** The header link's accessible name (criterion 8). */
export function cartCountLabel(count: number): string {
  return count === 0 ? "Carrito, vacío" : `Carrito, ${productsLabel(count)}`;
}

// --- Matching stored items against the catalog ---

/** What the cart page needs of a published Personas product or pack. */
export type CartProduct = {
  slug: string;
  name: string;
  priceFromClp: number | null;
  isAvailable: boolean;
  colors: { name: string; hex: string }[];
  sizes: string[];
  /** The cover photo; null when the product has none. */
  image: { storagePath: string; altText: string } | null;
};

export type CartLine = {
  key: string;
  item: CartItem;
  /** False when the product is no longer in the catalog (it has no page to link to). */
  found: boolean;
  /** The product's current name; the slug when it is no longer in the catalog. */
  name: string;
  image: CartProduct["image"];
  unitPrice: number | null;
  /** Price times quantity; null when the product has no price. */
  subtotal: number | null;
  /** False for a line left out of the total and the message (stale items). */
  included: boolean;
  /** Why it is left out, in Spanish; null when it is included. */
  reason: string | null;
};

// A product that is gone has no name to show: its slug, read as words.
function humanizeSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Checks each stored item against the current catalog (spec 006, "Stale items"). */
export function reconcile(items: CartItem[], products: CartProduct[]): CartLine[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return items.map((item) => {
    const key = itemKey(item);
    const product = bySlug.get(item.slug);
    const left = (reason: string, name: string, image: CartProduct["image"]): CartLine => ({
      key,
      item,
      found: product !== undefined,
      name,
      image,
      unitPrice: null,
      subtotal: null,
      included: false,
      reason,
    });
    if (!product) {
      return left("Este producto ya no está en el catálogo.", humanizeSlug(item.slug), null);
    }
    if (!product.isAvailable) return left("No disponible por ahora.", product.name, product.image);
    if (item.color !== null && !product.colors.some((c) => c.name === item.color)) {
      return left(
        `El color ${item.color} ya no está disponible. Quítalo y elige otro en la página del producto.`,
        product.name,
        product.image,
      );
    }
    if (item.size !== null && !product.sizes.includes(item.size)) {
      return left(
        `La talla ${item.size} ya no está disponible. Quítala y elige otra en la página del producto.`,
        product.name,
        product.image,
      );
    }
    const unitPrice = product.priceFromClp;
    return {
      key,
      item,
      found: true,
      name: product.name,
      image: product.image,
      unitPrice,
      subtotal: unitPrice === null ? null : unitPrice * item.quantity,
      included: true,
      reason: null,
    };
  });
}

export type Summary = {
  /** `total`: every included line has a price; `estimate`: some do; `none`: none does. */
  kind: "total" | "estimate" | "none";
  /** The sum of the priced lines; null for `none`. */
  amount: number | null;
  included: number;
  excluded: number;
  /** Included lines with no price. */
  unpriced: number;
};

export function summarize(lines: CartLine[]): Summary {
  const included = lines.filter((line) => line.included);
  const priced = included.filter((line) => line.subtotal !== null);
  const unpriced = included.length - priced.length;
  const amount = priced.reduce((sum, line) => sum + (line.subtotal ?? 0), 0);
  const kind = priced.length === 0 ? "none" : unpriced === 0 ? "total" : "estimate";
  return {
    kind,
    amount: kind === "none" ? null : amount,
    included: included.length,
    excluded: lines.length - included.length,
    unpriced,
  };
}

// --- Texts of the cart page and the message ---

export const DISCOUNT_NOTE =
  "Precios por unidad. Los descuentos por cantidad y al por mayor se conversan por WhatsApp.";
export const NONE_NOTE = "El precio se cotiza por WhatsApp.";

/** "Esto no es el total: 1 producto no tiene precio publicado y se cotiza por WhatsApp." */
export function estimateNote(unpriced: number): string {
  return unpriced === 1
    ? "Esto no es el total: 1 producto no tiene precio publicado y se cotiza por WhatsApp."
    : `Esto no es el total: ${unpriced} productos no tienen precio publicado y se cotizan por WhatsApp.`;
}

/** The "Enviar" button's note when some lines are left out. */
export function excludedLabel(count: number): string {
  return count === 1
    ? "1 producto no se incluye en el pedido"
    : `${count} productos no se incluyen en el pedido`;
}

export function orderMessage(lines: CartLine[]): string {
  const included = lines.filter((line) => line.included);
  const summary = summarize(lines);
  const blocks = included.map(({ item, name, unitPrice, subtotal }, n) => {
    const details = [
      item.color !== null ? `Color: ${item.color}` : null,
      item.size !== null ? `Talla: ${item.size}` : null,
      `Cantidad: ${item.quantity}`,
    ].filter((part) => part !== null);
    const rows = [`${n + 1}. ${name}`, `   ${details.join(" · ")}`];
    if (item.personalization !== "") rows.push(`   Personalización: "${item.personalization}"`);
    rows.push(
      unitPrice !== null && subtotal !== null
        ? `   ${formatClp(unitPrice)} c/u · Subtotal: ${formatClp(subtotal)}`
        : "   Precio por cotizar",
    );
    return rows.join("\n");
  });
  const total =
    summary.kind === "total"
      ? `Total: ${formatClp(summary.amount ?? 0)}`
      : summary.kind === "estimate"
        ? `Total estimado: ${formatClp(summary.amount ?? 0)} (${summary.unpriced} ${
            summary.unpriced === 1 ? "producto" : "productos"
          } por cotizar)`
        : "Precio por cotizar";
  return [
    "Hola, Marcando Ando. Quiero hacer este pedido:",
    "",
    blocks.join("\n\n"),
    "",
    total,
    "Las imágenes y los detalles te los mando por acá.",
  ].join("\n");
}

/** The WhatsApp link with the whole order in its `text` parameter. */
export function cartWhatsappUrl(lines: CartLine[]): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(orderMessage(lines))}`;
}
