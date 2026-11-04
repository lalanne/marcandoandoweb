import { describe, expect, it } from "vitest";
import {
  parseCatalogFilter,
  parseKindFilter,
  productListHref,
  productListView,
} from "@/lib/admin/product-list";
import type { Audience } from "@/lib/catalog/audience";
import type { ProductKind } from "@/lib/catalog/kind";

const item = (name: string, kind: ProductKind, is_published = true) => ({
  id: `id-${name}`,
  name,
  kind,
  is_published,
});

// 3 products and 2 packs, published or not, in name order.
const mixed = [
  item("Botella", "producto"),
  item("Pack curso", "pack", false),
  item("Pack regalo", "pack"),
  item("Polera", "producto", false),
  item("Taza", "producto"),
];

describe("parseKindFilter", () => {
  it("[002-AC40] reads producto and pack from the address", () => {
    expect(parseKindFilter("producto")).toBe("producto");
    expect(parseKindFilter("pack")).toBe("pack");
  });

  it("[002-AC40] falls back to todos when the address has no tipo or an unknown one", () => {
    for (const value of [undefined, "", "todos", "Pack", "packs", "botellas", ["pack", "producto"]]) {
      expect(parseKindFilter(value), JSON.stringify(value)).toBe("todos");
    }
  });
});

describe("productListView", () => {
  it("[002-AC39] counts every item of each type, published or not", () => {
    expect(productListView(mixed, "todos").counts).toEqual({
      todos: 5,
      producto: 3,
      pack: 2,
    });
    // The counts do not depend on the chosen filter.
    expect(productListView(mixed, "pack").counts).toEqual({
      todos: 5,
      producto: 3,
      pack: 2,
    });
  });

  it("[002-AC40] lists only the chosen type, in the incoming order, with no heading", () => {
    const packs = productListView(mixed, "pack");
    expect(packs.groups).toEqual([
      { kind: "pack", heading: null, items: [mixed[1], mixed[2]] },
    ]);
    expect(packs.emptyMessage).toBeNull();
    const productos = productListView(mixed, "producto");
    expect(productos.groups[0].items.map((p) => p.name)).toEqual([
      "Botella",
      "Polera",
      "Taza",
    ]);
  });

  it("[002-AC41] groups todos under Productos then Packs", () => {
    const view = productListView(mixed, "todos");
    expect(view.groups.map((g) => [g.heading, g.items.map((p) => p.name)])).toEqual([
      ["Productos", ["Botella", "Polera", "Taza"]],
      ["Packs", ["Pack curso", "Pack regalo"]],
    ]);
  });

  it("[002-AC41] leaves out a group with no items under todos", () => {
    const view = productListView([item("Botella", "producto")], "todos");
    expect(view.groups.map((g) => g.heading)).toEqual(["Productos"]);
    expect(view.emptyMessage).toBeNull();
  });

  it("[002-AC41] says so in Spanish when the chosen type has no items", () => {
    const onlyProducts = [item("Botella", "producto")];
    const packs = productListView(onlyProducts, "pack");
    expect(packs.groups).toEqual([]);
    expect(packs.emptyMessage).toBe("Todavía no hay packs.");
    expect(productListView([item("Pack", "pack")], "producto").emptyMessage).toBe(
      "Todavía no hay productos.",
    );
    expect(productListView([], "todos").emptyMessage).toBe(
      "Todavía no hay productos. Crea el primero con «Nuevo producto».",
    );
  });
});

const company = (name: string, kind: ProductKind, audience: Audience, is_published = true) => ({
  ...item(name, kind, is_published),
  audience,
});

// 3 Personas items and 2 Empresas items, one of them a pack, published or not.
const twoCatalogs = [
  company("Botella", "producto", "personas"),
  company("Polera", "producto", "personas", false),
  company("Pack curso", "pack", "personas"),
  company("Polo empresa", "producto", "empresas"),
  company("Pack empresa", "pack", "empresas", false),
];

describe("parseCatalogFilter", () => {
  it("[002-AC80] reads personas and empresas from the address", () => {
    expect(parseCatalogFilter("personas")).toBe("personas");
    expect(parseCatalogFilter("empresas")).toBe("empresas");
  });

  it("[002-AC80] falls back to todos when catalogo is missing or unknown", () => {
    for (const value of [undefined, "", "todos", "Empresas", "ambos", ["empresas", "personas"]]) {
      expect(parseCatalogFilter(value), JSON.stringify(value)).toBe("todos");
    }
  });
});

describe("productListView by catalog", () => {
  it("[002-AC79] counts every item of each catalog, published or not", () => {
    for (const catalog of ["todos", "personas", "empresas"] as const) {
      expect(productListView(twoCatalogs, "todos", catalog).catalogCounts).toEqual({
        todos: 5,
        personas: 3,
        empresas: 2,
      });
    }
  });

  it("[002-AC80] lists only the chosen catalog and counts the types within it", () => {
    const view = productListView(twoCatalogs, "todos", "empresas");
    expect(view.catalog).toBe("empresas");
    expect(view.counts).toEqual({ todos: 2, producto: 1, pack: 1 });
    expect(view.groups.map((g) => [g.heading, g.items.map((p) => p.name)])).toEqual([
      ["Productos", ["Polo empresa"]],
      ["Packs", ["Pack empresa"]],
    ]);
  });

  it("[002-AC80] combines the catalog with the type", () => {
    const view = productListView(twoCatalogs, "pack", "empresas");
    expect(view.groups.map((g) => g.items.map((p) => p.name))).toEqual([["Pack empresa"]]);
    expect(view.counts).toEqual({ todos: 2, producto: 1, pack: 1 });
    const people = productListView(twoCatalogs, "pack", "personas");
    expect(people.groups.map((g) => g.items.map((p) => p.name))).toEqual([["Pack curso"]]);
    expect(people.counts).toEqual({ todos: 3, producto: 2, pack: 1 });
  });

  it("[002-AC80] lists every catalog when none is chosen", () => {
    const view = productListView(twoCatalogs, "todos", "todos");
    expect(view.counts).toEqual({ todos: 5, producto: 3, pack: 2 });
    expect(productListView(twoCatalogs, "todos").groups).toEqual(view.groups);
  });

  it("[002-AC80] says so in Spanish when the chosen catalog has nothing of the chosen type", () => {
    const view = productListView([company("Botella", "producto", "personas")], "todos", "empresas");
    expect(view.groups).toEqual([]);
    expect(view.emptyMessage).toBe("Todavía no hay productos en este catálogo.");
  });
});

describe("productListHref", () => {
  it("[002-AC80] writes catalogo first, then tipo, and nothing for todos", () => {
    expect(productListHref("todos", "todos")).toBe("/panel/productos");
    expect(productListHref("empresas", "todos")).toBe("/panel/productos?catalogo=empresas");
    expect(productListHref("todos", "pack")).toBe("/panel/productos?tipo=pack");
    expect(productListHref("empresas", "pack")).toBe(
      "/panel/productos?catalogo=empresas&tipo=pack",
    );
  });
});
