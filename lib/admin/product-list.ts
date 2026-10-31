import { isProductKind, type ProductKind } from "@/lib/catalog/kind";

// The admin product list, split by type (spec 002, criteria 39 to 41). Pure, so
// the counting, filtering and grouping are unit tested.

export type KindFilter = "todos" | ProductKind;

export type ProductGroup<T> = {
  kind: ProductKind;
  /** "Productos" or "Packs" under Todos; none when one type is chosen. */
  heading: string | null;
  items: T[];
};

export type ProductListView<T> = {
  filter: KindFilter;
  counts: Record<KindFilter, number>;
  groups: ProductGroup<T>[];
  /** Spanish message when there is nothing to list, otherwise null. */
  emptyMessage: string | null;
};

const HEADING: Record<ProductKind, string> = { producto: "Productos", pack: "Packs" };

const EMPTY: Record<KindFilter, string> = {
  todos: "Todavía no hay productos. Crea el primero con «Nuevo producto».",
  producto: "Todavía no hay productos.",
  pack: "Todavía no hay packs.",
};

/** `?tipo=` from the address: producto or pack; anything else is todos. */
export function parseKindFilter(value: unknown): KindFilter {
  return isProductKind(value) ? value : "todos";
}

/** Counts every item by type and keeps the incoming order inside a group. */
export function productListView<T extends { kind: ProductKind }>(
  items: T[],
  filter: KindFilter,
): ProductListView<T> {
  const byKind = {
    producto: items.filter((p) => p.kind === "producto"),
    pack: items.filter((p) => p.kind === "pack"),
  };
  const counts = {
    todos: items.length,
    producto: byKind.producto.length,
    pack: byKind.pack.length,
  };

  const groups: ProductGroup<T>[] =
    filter === "todos"
      ? (["producto", "pack"] as const)
          .filter((kind) => byKind[kind].length > 0)
          .map((kind) => ({ kind, heading: HEADING[kind], items: byKind[kind] }))
      : byKind[filter].length > 0
        ? [{ kind: filter, heading: null, items: byKind[filter] }]
        : [];

  return {
    filter,
    counts,
    groups,
    emptyMessage: groups.length === 0 ? EMPTY[filter] : null,
  };
}
