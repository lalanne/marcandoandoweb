import type { ProductKind } from "./kind";
import type { CatalogProduct } from "./types";

// The special collections of the home page (spec 001 and 002, amendment of
// 2026-11-05). Fixed in code and in the database check constraint: adding a third
// is a spec change. "Todos" is not one of them: every published item is in it.
export const COLLECTIONS = ["navidad", "escolar"] as const;

export type Collection = (typeof COLLECTIONS)[number];

/** Spanish label of each collection: the tab and the admin checkbox. */
export const COLLECTION_LABEL: Record<Collection, string> = {
  navidad: "Especial Navidad",
  escolar: "Especial Escolar",
};

export function isCollection(value: unknown): value is Collection {
  return (COLLECTIONS as readonly unknown[]).includes(value);
}

/** The known collections in a value read from the database or a form, in the fixed order, once each. */
export function parseCollections(value: unknown): Collection[] {
  if (!Array.isArray(value)) return [];
  return COLLECTIONS.filter((c) => value.includes(c));
}

/** The collections that have at least one item, in the fixed order (spec 002, criteria 82 and 84). */
export function collectionsWithItems(products: CatalogProduct[]): Collection[] {
  return COLLECTIONS.filter((c) => products.some((p) => p.collections.includes(c)));
}

/**
 * The collection a visitor chose, from the `coleccion` value of the address. An
 * unknown value, or a collection with no item (its tab is not shown), is "Todos"
 * (null). A repeated parameter uses the first value (spec 002, criteria 83 and 84).
 */
export function pickCollection(
  param: string | string[] | undefined,
  available: readonly Collection[],
): Collection | null {
  const value = Array.isArray(param) ? param[0] : param;
  return isCollection(value) && available.includes(value) ? value : null;
}

/**
 * The Productos and Packs lists of a view: "Todos" (null) keeps every item, a
 * collection keeps the items that have it. Order is kept (spec 002, criteria 82,
 * 83 and 85).
 */
export function listForCollection(
  grouped: Record<ProductKind, CatalogProduct[]>,
  collection: Collection | null,
): Record<ProductKind, CatalogProduct[]> {
  if (collection === null) return grouped;
  const keep = (list: CatalogProduct[]) => list.filter((p) => p.collections.includes(collection));
  return { producto: keep(grouped.producto), pack: keep(grouped.pack) };
}
