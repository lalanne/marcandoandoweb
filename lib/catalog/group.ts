import type { CatalogCategory, CatalogProduct, CatalogSection } from "./types";

/**
 * Groups products by category. Categories keep their `position` order, empty
 * categories are dropped, and highlighted products come first inside a category
 * (otherwise the incoming order is kept).
 */
export function groupByCategory(
  categories: CatalogCategory[],
  products: CatalogProduct[],
): CatalogSection[] {
  return [...categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => {
      const inCategory = products.filter((p) => p.categoryId === category.id);
      const featured = inCategory.filter((p) => p.isFeatured);
      const rest = inCategory.filter((p) => !p.isFeatured);
      return { category, products: [...featured, ...rest] };
    })
    .filter((section) => section.products.length > 0);
}
