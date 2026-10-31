import type { ProductKind } from "./kind";
import type { CatalogProduct } from "./types";

/**
 * Splits products by type (spec 002, criteria 33 and 34). Highlighted products
 * come first inside a type; otherwise the incoming order is kept. A type with
 * no products gets an empty list, and its section is not shown.
 */
export function groupByKind(
  products: CatalogProduct[],
): Record<ProductKind, CatalogProduct[]> {
  const of = (kind: ProductKind) => {
    const inKind = products.filter((p) => p.kind === kind);
    return [...inKind.filter((p) => p.isFeatured), ...inKind.filter((p) => !p.isFeatured)];
  };
  return { producto: of("producto"), pack: of("pack") };
}
