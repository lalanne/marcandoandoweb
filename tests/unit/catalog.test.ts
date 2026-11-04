import { describe, expect, it } from "vitest";
import { AUDIENCE_LABEL, AUDIENCES, isAudience } from "@/lib/catalog/audience";
import { COMPANY_PRICE_NOTE, formatClp, priceLabel, WHOLESALE_NOTE } from "@/lib/catalog/format";
import { groupByAudience, groupByKind } from "@/lib/catalog/group";
import { imagePathFromSegments, imageUrl, panelImageUrl } from "@/lib/catalog/images";
import { isProductKind, KIND_LABEL, PRODUCT_KINDS } from "@/lib/catalog/kind";
import type { CatalogProduct } from "@/lib/catalog/types";

const prod = (
  slug: string,
  kind: CatalogProduct["kind"],
  extra: Partial<CatalogProduct> = {},
): CatalogProduct => ({
  id: `p-${slug}`,
  slug,
  name: slug,
  description: null,
  priceFromClp: null,
  kind,
  audience: "personas",
  isFeatured: false,
  isAvailable: true,
  images: [],
  colors: [],
  sizes: [],
  characteristics: "",
  ...extra,
});

describe("formatClp", () => {
  it("[002-AC12] writes pesos with a dot as thousands separator", () => {
    expect(formatClp(7000)).toBe("$7.000");
    expect(formatClp(14000)).toBe("$14.000");
    expect(formatClp(5500)).toBe("$5.500");
    expect(formatClp(900)).toBe("$900");
    expect(formatClp(1234567)).toBe("$1.234.567");
  });
});

describe("groupByKind", () => {
  it("[002-AC33] puts products of type producto in productos and packs in packs, highlighted first", () => {
    const groups = groupByKind([
      prod("polera", "producto"),
      prod("pack-cole", "pack"),
      prod("botella", "producto", { isFeatured: true }),
      prod("pack-navidad", "pack", { isFeatured: true }),
      prod("estuche", "producto"),
    ]);
    expect(groups.producto.map((p) => p.slug)).toEqual(["botella", "polera", "estuche"]);
    expect(groups.pack.map((p) => p.slug)).toEqual(["pack-navidad", "pack-cole"]);
  });

  it("[002-AC34] leaves a type empty when it has no products", () => {
    const groups = groupByKind([prod("polera", "producto")]);
    expect(groups.producto).toHaveLength(1);
    expect(groups.pack).toEqual([]);
    expect(groupByKind([])).toEqual({ producto: [], pack: [] });
  });
});

describe("product kinds", () => {
  it("[002-AC32] has exactly the two types, producto first, with Spanish labels", () => {
    expect(PRODUCT_KINDS).toEqual(["producto", "pack"]);
    expect(KIND_LABEL).toEqual({ producto: "Producto", pack: "Pack" });
    expect(isProductKind("pack")).toBe(true);
    expect(isProductKind("producto")).toBe(true);
    expect(isProductKind("Pack")).toBe(false);
    expect(isProductKind("")).toBe(false);
    expect(isProductKind("botellas")).toBe(false);
  });
});

describe("imageUrl", () => {
  it("[002-AC26] builds the same-origin URL of an image, never a storage URL", () => {
    expect(imageUrl("demo/botella.webp")).toBe("/img/demo/botella.webp");
  });

  it("[002-AC26] encodes each path segment", () => {
    expect(imageUrl("demo/mi foto.webp")).toBe("/img/demo/mi%20foto.webp");
  });
});

describe("panelImageUrl", () => {
  it("[002-AC26] builds the admin preview URL under /panel/img, encoding each segment", () => {
    expect(panelImageUrl("product/abc/mi foto.png")).toBe(
      "/panel/img/product/abc/mi%20foto.png",
    );
  });
});

describe("imagePathFromSegments", () => {
  it("[002-AC26] joins the route segments into a storage path", () => {
    expect(imagePathFromSegments(["demo", "botella.webp"])).toBe(
      "demo/botella.webp",
    );
  });

  it("[002-AC25] refuses empty paths and path traversal", () => {
    expect(imagePathFromSegments([])).toBeNull();
    expect(imagePathFromSegments(["demo", ".."])).toBeNull();
    expect(imagePathFromSegments(["."])).toBeNull();
    expect(imagePathFromSegments(["a", ""])).toBeNull();
    expect(imagePathFromSegments(["a\\b"])).toBeNull();
  });
});

describe("priceLabel", () => {
  it("[002-AC52] reads \"$7.000 c/u\", with the dot and no \"desde\"", () => {
    expect(priceLabel(7000)).toBe("$7.000 c/u");
    expect(priceLabel(14000)).toBe("$14.000 c/u");
    expect(priceLabel(7000)).not.toContain("desde");
  });

  it("[002-AC52] shows nothing, and no \"c/u\", for a product without a price", () => {
    expect(priceLabel(null)).toBeNull();
  });

  it("[002-AC53] the wholesale note is the approved text", () => {
    expect(WHOLESALE_NOTE).toBe(
      "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.",
    );
  });
});

describe("audiences", () => {
  it("[001-AC29] has exactly the two catalogs, personas first, with Spanish labels", () => {
    expect(AUDIENCES).toEqual(["personas", "empresas"]);
    expect(AUDIENCE_LABEL).toEqual({ personas: "Personas", empresas: "Empresas" });
    expect(isAudience("personas")).toBe(true);
    expect(isAudience("empresas")).toBe(true);
    expect(isAudience("Empresas")).toBe(false);
    expect(isAudience("")).toBe(false);
    expect(isAudience(null)).toBe(false);
    expect(isAudience("ambos")).toBe(false);
  });
});

describe("groupByAudience", () => {
  const mixedCatalog = [
    prod("polera", "producto"),
    prod("pack-cole", "pack"),
    prod("empresa-polo", "producto", { audience: "empresas" }),
    prod("empresa-taza", "producto", { audience: "empresas", isFeatured: true }),
    prod("empresa-pack", "pack", { audience: "empresas" }),
  ];

  it("[002-AC68] keeps the Personas items apart from the Empresas ones", () => {
    const groups = groupByAudience(mixedCatalog);
    expect(groups.personas.producto.map((p) => p.slug)).toEqual(["polera"]);
    expect(groups.personas.pack.map((p) => p.slug)).toEqual(["pack-cole"]);
    expect(
      [...groups.personas.producto, ...groups.personas.pack].some((p) => p.audience === "empresas"),
    ).toBe(false);
  });

  it("[002-AC71] lists each Empresas type apart, highlighted first, and leaves a type with none empty", () => {
    const groups = groupByAudience(mixedCatalog);
    expect(groups.empresas.producto.map((p) => p.slug)).toEqual(["empresa-taza", "empresa-polo"]);
    expect(groups.empresas.pack.map((p) => p.slug)).toEqual(["empresa-pack"]);
    const onlyPeople = groupByAudience([prod("polera", "producto")]);
    expect(onlyPeople.empresas).toEqual({ producto: [], pack: [] });
  });
});

describe("price label by audience", () => {
  it("[002-AC73] gives no price label for an Empresas item, even with a price", () => {
    expect(priceLabel(7000, "empresas")).toBeNull();
    expect(priceLabel(null, "empresas")).toBeNull();
    expect(priceLabel(7000, "personas")).toBe("$7.000 c/u");
    expect(priceLabel(7000)).toBe("$7.000 c/u");
  });

  it("[002-AC73] has the company note, and it is not the wholesale note", () => {
    expect(COMPANY_PRICE_NOTE).toBe("Precios según cantidad: cotiza por WhatsApp.");
    expect(COMPANY_PRICE_NOTE).not.toBe(WHOLESALE_NOTE);
  });
});
