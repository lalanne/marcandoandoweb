import { isAudience, type Audience } from "@/lib/catalog/audience";
import { isProductKind, type ProductKind } from "@/lib/catalog/kind";

// The admin product list, split by catalog and type (spec 002, criteria 39 to 41
// and 79 to 80). Pure, so the counting, filtering and grouping are unit tested.

export type KindFilter = "todos" | ProductKind;
export type CatalogFilter = "todos" | Audience;

export type ProductGroup<T> = {
  kind: ProductKind;
  /** "Productos" or "Packs" under Todos; none when one type is chosen. */
  heading: string | null;
  items: T[];
};

export type ProductListView<T> = {
  filter: KindFilter;
  catalog: CatalogFilter;
  /** Items per type within the chosen catalog. */
  counts: Record<KindFilter, number>;
  /** Items per catalog, whatever catalog or type is chosen. */
  catalogCounts: Record<CatalogFilter, number>;
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

const EMPTY_IN_CATALOG = "Todavía no hay productos en este catálogo.";

/** `?tipo=` from the address: producto or pack; anything else is todos. */
export function parseKindFilter(value: unknown): KindFilter {
  return isProductKind(value) ? value : "todos";
}

/** `?catalogo=` from the address: personas or empresas; anything else is todos. */
export function parseCatalogFilter(value: unknown): CatalogFilter {
  return isAudience(value) ? value : "todos";
}

/** The list address for a choice of catalog and type; `catalogo` comes first. */
export function productListHref(catalog: CatalogFilter, kind: KindFilter): string {
  const query = [
    catalog === "todos" ? null : `catalogo=${catalog}`,
    kind === "todos" ? null : `tipo=${kind}`,
  ].filter((part) => part !== null);
  return query.length > 0 ? `/panel/productos?${query.join("&")}` : "/panel/productos";
}

/**
 * Keeps the chosen catalog, counts the items of each type within it and keeps
 * the incoming order inside a group. An item with no `audience` counts as
 * Personas.
 */
export function productListView<T extends { kind: ProductKind; audience?: Audience }>(
  allItems: T[],
  filter: KindFilter,
  catalog: CatalogFilter = "todos",
): ProductListView<T> {
  const audienceOf = (p: T): Audience => p.audience ?? "personas";
  const catalogCounts = {
    todos: allItems.length,
    personas: allItems.filter((p) => audienceOf(p) === "personas").length,
    empresas: allItems.filter((p) => audienceOf(p) === "empresas").length,
  };
  const items =
    catalog === "todos" ? allItems : allItems.filter((p) => audienceOf(p) === catalog);

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
    catalog,
    counts,
    catalogCounts,
    groups,
    emptyMessage:
      groups.length === 0
        ? catalog !== "todos" && filter === "todos"
          ? EMPTY_IN_CATALOG
          : EMPTY[filter]
        : null,
  };
}
