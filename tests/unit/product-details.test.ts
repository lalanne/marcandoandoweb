import { describe, expect, it } from "vitest";
import {
  backLink,
  characteristicsItems,
  parseColors,
  parseSizes,
  productMetadata,
  productPageView,
  productPath,
  productUrl,
} from "@/lib/catalog/details";
import type { CatalogProduct } from "@/lib/catalog/types";

const base: CatalogProduct = {
  id: "p1",
  slug: "polera-de-ejemplo",
  name: "Polera de ejemplo",
  description: "Producto falso.",
  priceFromClp: 7000,
  kind: "producto",
  isFeatured: false,
  isAvailable: true,
  images: [
    { storagePath: "demo/a b.webp", altText: "Polera de ejemplo, frente" },
    { storagePath: "demo/c.webp", altText: "Polera de ejemplo, espalda" },
  ],
  colors: [
    { name: "Rosado", hex: "#E8647F" },
    { name: "Celeste", hex: "#4FB0B0" },
  ],
  sizes: ["4", "6", "8"],
  characteristics: "100% algodón\nEstampado con vinilo",
};

describe("characteristicsItems", () => {
  it("[002-AC57] makes one item per line, trimmed, in order", () => {
    expect(characteristicsItems("100% algodón\nEstampado con vinilo")).toEqual([
      "100% algodón",
      "Estampado con vinilo",
    ]);
    expect(characteristicsItems("  uno \r\n\r\n  dos  \n")).toEqual(["uno", "dos"]);
  });

  it("[002-AC58] gives no items for empty or missing text", () => {
    expect(characteristicsItems("")).toEqual([]);
    expect(characteristicsItems("  \n \n")).toEqual([]);
    expect(characteristicsItems(null)).toEqual([]);
  });
});

describe("parseColors and parseSizes", () => {
  it("[001-AC27] keep the order saved and drop anything malformed", () => {
    expect(
      parseColors([
        { name: "Rosado", hex: "#E8647F" },
        { name: "Celeste", hex: "#4FB0B0" },
      ]),
    ).toEqual([
      { name: "Rosado", hex: "#E8647F" },
      { name: "Celeste", hex: "#4FB0B0" },
    ]);
    expect(parseColors([{ name: 1 }, null, "x", { name: "Ok", hex: "#000000" }])).toEqual([
      { name: "Ok", hex: "#000000" },
    ]);
    expect(parseColors(null)).toEqual([]);
    expect(parseSizes(["4", "6", "8"])).toEqual(["4", "6", "8"]);
    expect(parseSizes(["4", 6, null])).toEqual(["4"]);
    expect(parseSizes("4")).toEqual([]);
  });
});

describe("productPageView", () => {
  it("[002-AC57] has the price, colors, sizes and characteristics of a full product", () => {
    const view = productPageView(base);
    expect(view.price).toBe("$7.000 c/u");
    expect(view.colors.map((c) => c.name)).toEqual(["Rosado", "Celeste"]);
    expect(view.sizes).toEqual(["4", "6", "8"]);
    expect(view.characteristics).toHaveLength(2);
  });

  it("[002-AC58] has nothing for the parts that are empty", () => {
    const view = productPageView({
      ...base,
      priceFromClp: null,
      colors: [],
      sizes: [],
      characteristics: "",
      description: null,
    });
    expect(view.price).toBeNull();
    expect(view.colors).toEqual([]);
    expect(view.sizes).toEqual([]);
    expect(view.characteristics).toEqual([]);
  });
});

describe("links", () => {
  it("[002-AC62] builds the address to share from the origin and the slug", () => {
    expect(productPath("polera-de-ejemplo")).toBe("/productos/polera-de-ejemplo");
    expect(productUrl("https://marcandoando.cl", "polera-de-ejemplo")).toBe(
      "https://marcandoando.cl/productos/polera-de-ejemplo",
    );
    expect(productUrl("https://marcandoando.cl/", "polera-de-ejemplo")).toBe(
      "https://marcandoando.cl/productos/polera-de-ejemplo",
    );
  });

  it("[002-AC65] sends the back link to the section of the product's type", () => {
    expect(backLink("producto")).toEqual({ label: "Volver a productos", href: "/#productos" });
    expect(backLink("pack")).toEqual({ label: "Volver a packs", href: "/#packs" });
  });
});

describe("productMetadata", () => {
  const origin = "https://marcandoando.cl";

  it("[002-AC61] has the title, description with the price, canonical and Open Graph tags", () => {
    const m = productMetadata(base, origin);
    expect(m.title).toBe("Polera de ejemplo | Marcando Ando");
    expect(m.description).toContain("$7.000 c/u");
    expect(m.description).toContain("Polera de ejemplo");
    expect(m.alternates?.canonical).toBe("https://marcandoando.cl/productos/polera-de-ejemplo");
    const og = m.openGraph as Record<string, unknown>;
    expect(og.title).toBe("Polera de ejemplo | Marcando Ando");
    expect(og.description).toBe(m.description);
    expect(og.url).toBe("https://marcandoando.cl/productos/polera-de-ejemplo");
    expect(og.images).toEqual([
      {
        url: "https://marcandoando.cl/img/demo/a%20b.webp",
        alt: "Polera de ejemplo, frente",
      },
    ]);
  });

  it("[002-AC61] leaves the price out when there is none, and the image when there is no photo", () => {
    const m = productMetadata({ ...base, priceFromClp: null, images: [] }, origin);
    expect(m.description).not.toContain("$");
    expect((m.openGraph as Record<string, unknown>).images).toBeUndefined();
  });

  it("[002-AC61] says what it is: a pack or a product", () => {
    expect(productMetadata({ ...base, kind: "pack" }, origin).description).toContain("pack");
    expect(productMetadata(base, origin).description).toContain("producto");
  });
});
