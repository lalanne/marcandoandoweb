import { describe, expect, it } from "vitest";
import {
  COLLECTION_LABEL,
  COLLECTIONS,
  collectionsWithItems,
  isCollection,
  listForCollection,
  parseCollections,
  pickCollection,
} from "@/lib/catalog/collection";
import { groupByKind } from "@/lib/catalog/group";
import type { CatalogProduct } from "@/lib/catalog/types";

// Spec 001 criteria 33 to 35 (the list and its values) and spec 002 criteria 82 to
// 85 (the pure function that picks the collection from the address and filters and
// groups the items).

const prod = (
  slug: string,
  kind: CatalogProduct["kind"],
  collections: CatalogProduct["collections"],
  extra: Partial<CatalogProduct> = {},
): CatalogProduct => ({
  id: `p-${slug}`,
  slug,
  name: slug,
  description: null,
  priceFromClp: null,
  kind,
  audience: "personas",
  collections,
  isFeatured: false,
  isAvailable: true,
  images: [],
  colors: [],
  sizes: [],
  characteristics: "",
  ...extra,
});

const navidadProduct = prod("navidad-producto", "producto", ["navidad"]);
const navidadPack = prod("navidad-pack", "pack", ["navidad"]);
const escolarProduct = prod("escolar-producto", "producto", ["escolar"]);
const both = prod("ambos", "producto", ["navidad", "escolar"], { isFeatured: true });
const none = prod("ninguna", "producto", []);
const nonePack = prod("ninguna-pack", "pack", []);
const all = [navidadProduct, navidadPack, escolarProduct, both, none, nonePack];

describe("collections list", () => {
  it("[001-AC33] has exactly navidad and escolar, in that order, with Spanish labels", () => {
    expect(COLLECTIONS).toEqual(["navidad", "escolar"]);
    expect(COLLECTION_LABEL).toEqual({
      navidad: "Especial Navidad",
      escolar: "Especial Escolar",
    });
  });

  it("[001-AC33] isCollection accepts only the two values", () => {
    expect(isCollection("navidad")).toBe(true);
    expect(isCollection("escolar")).toBe(true);
    for (const v of ["todos", "Navidad", "", null, undefined, 1, ["navidad"]]) {
      expect(isCollection(v), String(v)).toBe(false);
    }
  });

  it("[001-AC35] parseCollections keeps the known values in the fixed order, once each", () => {
    expect(parseCollections(["escolar", "navidad", "navidad", "otra"])).toEqual([
      "navidad",
      "escolar",
    ]);
    expect(parseCollections(null)).toEqual([]);
    expect(parseCollections("navidad")).toEqual([]);
    expect(parseCollections([])).toEqual([]);
  });
});

describe("collectionsWithItems", () => {
  it("[002-AC82] lists the collections that have at least one item, in the fixed order", () => {
    expect(collectionsWithItems(all)).toEqual(["navidad", "escolar"]);
    expect(collectionsWithItems([escolarProduct])).toEqual(["escolar"]);
    expect(collectionsWithItems([navidadPack, none])).toEqual(["navidad"]);
  });

  it("[002-AC84] lists none when no item is in a collection", () => {
    expect(collectionsWithItems([none, nonePack])).toEqual([]);
    expect(collectionsWithItems([])).toEqual([]);
  });
});

describe("pickCollection", () => {
  const available = ["navidad", "escolar"] as const;

  it("[002-AC82] no value is Todos", () => {
    expect(pickCollection(undefined, [...available])).toBeNull();
    expect(pickCollection("", [...available])).toBeNull();
  });

  it("[002-AC83] a known value with items is that collection", () => {
    expect(pickCollection("navidad", [...available])).toBe("navidad");
    expect(pickCollection("escolar", [...available])).toBe("escolar");
  });

  it("[002-AC84] an unknown value, or a collection with no items, is Todos", () => {
    expect(pickCollection("otra", [...available])).toBeNull();
    expect(pickCollection("Navidad", [...available])).toBeNull();
    expect(pickCollection("todos", [...available])).toBeNull();
    expect(pickCollection("escolar", ["navidad"])).toBeNull();
    expect(pickCollection("navidad", [])).toBeNull();
  });

  it("[002-AC84] a repeated parameter uses the first value", () => {
    expect(pickCollection(["navidad", "escolar"], [...available])).toBe("navidad");
    expect(pickCollection(["otra", "navidad"], [...available])).toBeNull();
  });
});

describe("listForCollection", () => {
  const grouped = groupByKind(all);

  it("[002-AC82] Todos lists every item, products and packs, highlighted first", () => {
    const todos = listForCollection(grouped, null);
    expect(todos.producto.map((p) => p.slug)).toEqual([
      "ambos",
      "navidad-producto",
      "escolar-producto",
      "ninguna",
    ]);
    expect(todos.pack.map((p) => p.slug)).toEqual(["navidad-pack", "ninguna-pack"]);
  });

  it("[002-AC83] a collection lists only its products and its packs", () => {
    const navidad = listForCollection(grouped, "navidad");
    expect(navidad.producto.map((p) => p.slug)).toEqual(["ambos", "navidad-producto"]);
    expect(navidad.pack.map((p) => p.slug)).toEqual(["navidad-pack"]);
  });

  it("[002-AC83] a collection with no pack leaves the pack list empty", () => {
    const escolar = listForCollection(grouped, "escolar");
    expect(escolar.producto.map((p) => p.slug)).toEqual(["ambos", "escolar-producto"]);
    expect(escolar.pack).toEqual([]);
  });

  it("[002-AC85] an item in both collections is in both, an item in none only in Todos", () => {
    const slugs = (c: "navidad" | "escolar" | null) => {
      const g = listForCollection(grouped, c);
      return [...g.producto, ...g.pack].map((p) => p.slug);
    };
    expect(slugs("navidad")).toContain("ambos");
    expect(slugs("escolar")).toContain("ambos");
    expect(slugs(null)).toContain("ninguna");
    expect(slugs("navidad")).not.toContain("ninguna");
    expect(slugs("escolar")).not.toContain("ninguna");
  });
});
