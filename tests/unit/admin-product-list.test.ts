import { describe, expect, it } from "vitest";
import { parseKindFilter, productListView } from "@/lib/admin/product-list";
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
