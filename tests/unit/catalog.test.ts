import { describe, expect, it } from "vitest";
import { formatClp } from "@/lib/catalog/format";
import { groupByKind } from "@/lib/catalog/group";
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
  isFeatured: false,
  isAvailable: true,
  coverImage: null,
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
