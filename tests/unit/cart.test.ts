import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartCount,
  cartCountLabel,
  cartWhatsappUrl,
  changeQuantity,
  CART_VERSION,
  emptyCart,
  markSent,
  orderMessage,
  parseQuantity,
  parseStoredCart,
  reconcile,
  removeLine,
  serializeCart,
  summarize,
  type Cart,
  type CartItem,
  type CartProduct,
} from "../../lib/cart/cart";

// Spec 006: the pure cart logic (merge rule, limits, typed quantities, stored data
// and its version, stale items, totals and the WhatsApp message).

const item = (over: Partial<CartItem> = {}): CartItem => ({
  slug: "polera",
  color: "Rosado",
  size: "6",
  quantity: 1,
  personalization: "",
  ...over,
});

const product = (over: Partial<CartProduct> = {}): CartProduct => ({
  slug: "polera",
  name: "Polera",
  priceFromClp: 7000,
  isAvailable: true,
  colors: [{ name: "Rosado", hex: "#E8647F" }],
  sizes: ["4", "6"],
  image: null,
  ...over,
});

function added(cart: Cart, i: CartItem): Cart {
  const result = addToCart(cart, i);
  if (!result.ok) throw new Error(result.error);
  return result.cart;
}

describe("adding to the cart", () => {
  it("[006-AC5] the same product, color, size and personalization adds to the quantity", () => {
    let cart = added(emptyCart(), item({ quantity: 2, personalization: "Sofía" }));
    cart = added(cart, item({ quantity: 3, personalization: "Sofía" }));
    expect(cart.items).toEqual([item({ quantity: 5, personalization: "Sofía" })]);
  });

  it("[006-AC5] any difference in color, size, personalization or product is a new line", () => {
    let cart = added(emptyCart(), item());
    cart = added(cart, item({ color: "Celeste" }));
    cart = added(cart, item({ size: "4" }));
    cart = added(cart, item({ personalization: "Sofía" }));
    cart = added(cart, item({ slug: "otra" }));
    expect(cart.items).toHaveLength(5);
  });

  it("[006-AC7] a 21st line is refused and the cart does not change", () => {
    let cart = emptyCart();
    for (let n = 1; n <= 20; n++) cart = added(cart, item({ personalization: `n${n}` }));
    const result = addToCart(cart, item({ personalization: "otro" }));
    expect(result).toEqual({ ok: false, error: "lines" });
    // An existing line still takes more units: it is not a new line.
    expect(addToCart(cart, item({ personalization: "n1" })).ok).toBe(true);
  });

  it("[006-AC7] a quantity under 1, over 999 or not whole is refused; the sum may not pass 999", () => {
    expect(addToCart(emptyCart(), item({ quantity: 0 }))).toEqual({ ok: false, error: "quantity" });
    expect(addToCart(emptyCart(), item({ quantity: 1000 }))).toEqual({ ok: false, error: "quantity" });
    expect(addToCart(emptyCart(), item({ quantity: 1.5 }))).toEqual({ ok: false, error: "quantity" });
    const cart = added(emptyCart(), item({ quantity: 999 }));
    expect(addToCart(cart, item({ quantity: 1 }))).toEqual({ ok: false, error: "quantity" });
  });

  it("[006-AC7] a personalization of 201 characters is refused, 200 is accepted", () => {
    expect(addToCart(emptyCart(), item({ personalization: "a".repeat(201) }))).toEqual({
      ok: false,
      error: "personalization",
    });
    expect(addToCart(emptyCart(), item({ personalization: "a".repeat(200) })).ok).toBe(true);
  });

  it("[006-AC19] any change to the cart clears the sent flag; marking it sets it", () => {
    const sent = markSent(added(emptyCart(), item()));
    expect(sent.sent).toBe(true);
    expect(added(sent, item()).sent).toBe(false);
    const line = sent.items[0];
    const key = lineKeyOf(line);
    expect(changeQuantity(sent, key, 3).sent).toBe(false);
    expect(removeLine(sent, key).sent).toBe(false);
  });
});

describe("changing and removing lines", () => {
  it("[006-AC12] changes a quantity and removes a line by its key", () => {
    let cart = added(emptyCart(), item({ quantity: 2 }));
    cart = added(cart, item({ slug: "otra", color: null, size: null }));
    const [first, second] = cart.items;
    cart = changeQuantity(cart, lineKeyOf(first), 5);
    expect(cart.items[0].quantity).toBe(5);
    cart = removeLine(cart, lineKeyOf(second));
    expect(cart.items).toHaveLength(1);
    cart = removeLine(cart, lineKeyOf(first));
    expect(cart.items).toEqual([]);
  });

  it("[006-AC27] changeQuantity ignores a quantity outside 1 to 999", () => {
    const cart = added(emptyCart(), item({ quantity: 2 }));
    expect(changeQuantity(cart, lineKeyOf(cart.items[0]), 0)).toEqual(cart);
    expect(changeQuantity(cart, lineKeyOf(cart.items[0]), 1000)).toEqual(cart);
  });

  it("[006-AC8] counts the sum of the quantities of every line", () => {
    let cart = added(emptyCart(), item({ quantity: 2 }));
    cart = added(cart, item({ slug: "otra", quantity: 3 }));
    expect(cartCount(cart)).toBe(5);
    expect(cartCount(emptyCart())).toBe(0);
  });

  it("[006-AC8] the accessible name of the header link", () => {
    expect(cartCountLabel(3)).toBe("Carrito, 3 productos");
    expect(cartCountLabel(1)).toBe("Carrito, 1 producto");
    expect(cartCountLabel(0)).toBe("Carrito, vacío");
  });
});

function lineKeyOf(i: CartItem): string {
  return reconcile([i], [product({ slug: i.slug })])[0].key;
}

describe("typed quantities", () => {
  it("[006-AC27] accepts whole numbers from 1 to 999", () => {
    expect(parseQuantity("5")).toBe(5);
    expect(parseQuantity(" 12 ")).toBe(12);
    expect(parseQuantity("1")).toBe(1);
    expect(parseQuantity("999")).toBe(999);
  });

  it("[006-AC27] refuses 0, 1000, words, decimals, signs and an empty field", () => {
    for (const text of ["0", "1000", "dos", "", "  ", "1.5", "-3", "+3", "1e2", "3 4"]) {
      expect(parseQuantity(text), text).toBeNull();
    }
  });
});

describe("stored data", () => {
  it("[006-AC14] a cart survives being stored and read back", () => {
    const cart = markSent(added(emptyCart(), item({ quantity: 2, personalization: "Sofía" })));
    expect(parseStoredCart(serializeCart(cart))).toEqual(cart);
  });

  it("[006-AC14] nothing, damaged text and other shapes read as an empty cart", () => {
    for (const raw of [null, undefined, "", "{", "null", "[]", "42", '"x"', "{}"]) {
      expect(parseStoredCart(raw), String(raw)).toEqual(emptyCart());
    }
  });

  it("[006-AC29] an unknown version reads as an empty cart", () => {
    const raw = JSON.stringify({ version: CART_VERSION + 1, items: [item()], sent: false });
    expect(parseStoredCart(raw)).toEqual(emptyCart());
    expect(parseStoredCart(JSON.stringify({ items: [item()], sent: false }))).toEqual(emptyCart());
  });

  it("[006-AC29] an invalid item, quantity, personalization or line count reads as an empty cart", () => {
    const wrap = (items: unknown) => JSON.stringify({ version: CART_VERSION, items, sent: false });
    expect(parseStoredCart(wrap([{ ...item(), quantity: 0 }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([{ ...item(), quantity: 1000 }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([{ ...item(), quantity: "2" }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([{ ...item(), slug: "" }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([{ ...item(), color: 5 }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([{ ...item(), personalization: "a".repeat(201) }]))).toEqual(emptyCart());
    expect(parseStoredCart(wrap([null]))).toEqual(emptyCart());
    const many = Array.from({ length: 21 }, (_, n) => ({ ...item(), personalization: `n${n}` }));
    expect(parseStoredCart(wrap(many))).toEqual(emptyCart());
  });

  it("[006-AC29] a valid stored cart with the current version is read", () => {
    const raw = JSON.stringify({ version: CART_VERSION, items: [item({ quantity: 4 })], sent: false });
    expect(parseStoredCart(raw).items).toEqual([item({ quantity: 4 })]);
  });
});

describe("reconciling with the catalog", () => {
  it("[006-AC11] a line has the current name, price, subtotal and photo of its product", () => {
    const photo = { storagePath: "a/b.webp", altText: "Foto" };
    const [line] = reconcile(
      [item({ quantity: 2 })],
      [product({ name: "Polera nueva", priceFromClp: 7000, image: photo })],
    );
    expect(line).toMatchObject({
      included: true,
      reason: null,
      name: "Polera nueva",
      unitPrice: 7000,
      subtotal: 14000,
      image: photo,
    });
  });

  it("[006-AC11] a product with no price has no unit price and no subtotal", () => {
    const [line] = reconcile([item()], [product({ priceFromClp: null })]);
    expect(line).toMatchObject({ included: true, unitPrice: null, subtotal: null });
  });

  it("[006-AC22] a changed price is used", () => {
    const [line] = reconcile([item({ quantity: 3 })], [product({ priceFromClp: 9900 })]);
    expect(line.subtotal).toBe(29700);
  });

  it("[006-AC20] a product missing from the catalog is left out as gone", () => {
    const [line] = reconcile([item()], []);
    expect(line).toMatchObject({
      included: false,
      reason: "Este producto ya no está en el catálogo.",
    });
  });

  it("[006-AC21] an unavailable product is left out", () => {
    const [line] = reconcile([item()], [product({ isAvailable: false })]);
    expect(line).toMatchObject({ included: false, reason: "No disponible por ahora." });
  });

  it("[006-AC21] a color or a size that is no longer offered is left out with its reason", () => {
    const [color] = reconcile([item({ color: "Rosado" })], [product({ colors: [{ name: "Azul", hex: "#0000FF" }] })]);
    expect(color).toMatchObject({
      included: false,
      reason: "El color Rosado ya no está disponible. Quítalo y elige otro en la página del producto.",
    });
    const [size] = reconcile([item({ size: "6" })], [product({ sizes: ["4"] })]);
    expect(size).toMatchObject({
      included: false,
      reason: "La talla 6 ya no está disponible. Quítala y elige otra en la página del producto.",
    });
  });

  it("[006-AC21] a line with no color or size stays included whatever the product offers", () => {
    const [line] = reconcile([item({ color: null, size: null })], [product()]);
    expect(line.included).toBe(true);
  });
});

describe("total and estimate", () => {
  const lines = (...parts: [number | null, number][]) =>
    reconcile(
      parts.map(([, quantity], n) => item({ slug: `p${n}`, color: null, size: null, quantity })),
      parts.map(([price], n) => product({ slug: `p${n}`, priceFromClp: price, colors: [], sizes: [] })),
    );

  it("[006-AC15] every line with a price is a total", () => {
    expect(summarize(lines([7000, 2], [7900, 1]))).toMatchObject({
      kind: "total",
      amount: 21900,
      unpriced: 0,
      excluded: 0,
    });
  });

  it("[006-AC16] some lines without a price make an estimate that counts them", () => {
    expect(summarize(lines([7000, 2], [null, 1]))).toMatchObject({
      kind: "estimate",
      amount: 14000,
      unpriced: 1,
    });
    expect(summarize(lines([7000, 2], [null, 1], [null, 4]))).toMatchObject({
      kind: "estimate",
      unpriced: 2,
    });
  });

  it("[006-AC17] no line with a price has no amount", () => {
    expect(summarize(lines([null, 1], [null, 2]))).toMatchObject({
      kind: "none",
      amount: null,
      unpriced: 2,
    });
  });

  it("[006-AC21] lines left out are counted and are not in the amount", () => {
    const all = [
      ...lines([7000, 1]),
      ...reconcile([item({ slug: "x" }), item({ slug: "y" })], []),
    ];
    expect(summarize(all)).toMatchObject({ kind: "total", amount: 7000, excluded: 2, included: 1 });
    expect(summarize(reconcile([item()], [])).included).toBe(0);
  });
});

describe("the WhatsApp message", () => {
  const catalog = [
    product({ slug: "poleron", name: "Polerón escolar", priceFromClp: 9900, colors: [{ name: "Azul marino", hex: "#001f3f" }], sizes: ["12"] }),
    product({ slug: "botella", name: "Botella metálica", priceFromClp: null, colors: [], sizes: [] }),
  ];
  const items = [
    item({ slug: "poleron", color: "Azul marino", size: "12", quantity: 2, personalization: "4°B 2026" }),
    item({ slug: "botella", color: null, size: null, quantity: 1 }),
  ];

  it("[006-AC18] is the message of the spec for a cart with a priced and an unpriced line", () => {
    expect(orderMessage(reconcile(items, catalog))).toBe(
      [
        "Hola, Marcando Ando. Quiero hacer este pedido:",
        "",
        "1. Polerón escolar",
        "   Color: Azul marino · Talla: 12 · Cantidad: 2",
        '   Personalización: "4°B 2026"',
        "   $9.900 c/u · Subtotal: $19.800",
        "",
        "2. Botella metálica",
        "   Cantidad: 1",
        "   Precio por cotizar",
        "",
        "Total estimado: $19.800 (1 producto por cotizar)",
        "Las imágenes y los detalles te los mando por acá.",
      ].join("\n"),
    );
  });

  it("[006-AC18] has 'Total: $X' when every line has a price and 'Precio por cotizar' when none has", () => {
    const priced = reconcile([items[0]], catalog);
    expect(orderMessage(priced)).toContain("\nTotal: $19.800\n");
    const none = reconcile([items[1]], catalog);
    const text = orderMessage(none);
    expect(text.split("\n").slice(-2)).toEqual([
      "Precio por cotizar",
      "Las imágenes y los detalles te los mando por acá.",
    ]);
    expect(text).not.toContain("Total");
  });

  it("[006-AC18] says 'productos' for more than one line without a price", () => {
    const two = reconcile(
      [items[1], item({ slug: "otra", color: null, size: null })],
      [...catalog, product({ slug: "otra", name: "Otra", priceFromClp: null, colors: [], sizes: [] }), product({ slug: "tres", priceFromClp: 100 })],
    );
    expect(orderMessage(two)).not.toContain("Total estimado");
    const mixed = reconcile(
      [items[0], items[1], item({ slug: "otra", color: null, size: null })],
      [...catalog, product({ slug: "otra", name: "Otra", priceFromClp: null, colors: [], sizes: [] })],
    );
    expect(orderMessage(mixed)).toContain("Total estimado: $19.800 (2 productos por cotizar)");
  });

  it("[006-AC20] leaves lines that are left out of the message and numbers the rest", () => {
    const text = orderMessage(reconcile([item({ slug: "gone" }), items[1]], catalog));
    expect(text).toContain("1. Botella metálica");
    expect(text).not.toContain("gone");
    expect(text).not.toContain("Polera");
  });

  it("[006-AC18] the link is wa.me with the message encoded in text", () => {
    const lines = reconcile(items, catalog);
    const url = new URL(cartWhatsappUrl(lines));
    expect(url.origin + url.pathname).toBe("https://wa.me/56982661835");
    expect(url.searchParams.get("text")).toBe(orderMessage(lines));
  });
});
