import type { SupabaseClient } from "@supabase/supabase-js";
import { groupByCategory } from "./group";
import type {
  Catalog,
  CatalogCategory,
  CatalogDesign,
  CatalogImage,
  CatalogProduct,
} from "./types";

type ImageRow = {
  storage_path: string;
  alt_text: string;
  position: number;
};

function toImage(row: ImageRow): CatalogImage {
  return { storagePath: row.storage_path, altText: row.alt_text };
}

function byPosition(a: ImageRow, b: ImageRow): number {
  return a.position - b.position;
}

/**
 * Everything the public page shows, read with an anonymous client. Row-level
 * security already limits it to published rows; the filters here only make the
 * intent explicit. Unavailable products are kept (spec 001, "Visibility").
 */
export async function getCatalog(client: SupabaseClient): Promise<Catalog> {
  const [categories, products, designs] = await Promise.all([
    client
      .from("category")
      .select("id, slug, name, position")
      .eq("is_published", true)
      .order("position"),
    client
      .from("product")
      .select(
        "id, slug, name, description, price_from_clp, category_id, is_featured, is_available, image(storage_path, alt_text, position)",
      )
      .eq("is_published", true)
      .order("name"),
    client
      .from("design")
      .select(
        "id, slug, title, description, image(storage_path, alt_text, position)",
      )
      .eq("is_published", true)
      .order("title"),
  ]);

  for (const result of [categories, products, designs]) {
    if (result.error) throw new Error(result.error.message);
  }

  const categoryList: CatalogCategory[] = (categories.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    position: c.position,
  }));

  const productList: CatalogProduct[] = (products.data ?? []).map((p) => {
    const images = ([...(p.image ?? [])] as ImageRow[]).sort(byPosition);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceFromClp: p.price_from_clp,
      categoryId: p.category_id,
      isFeatured: p.is_featured,
      isAvailable: p.is_available,
      coverImage: images[0] ? toImage(images[0]) : null,
    };
  });

  const designList: CatalogDesign[] = (designs.data ?? []).map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    description: d.description,
    images: ([...(d.image ?? [])] as ImageRow[]).sort(byPosition).map(toImage),
  }));

  return {
    sections: groupByCategory(categoryList, productList),
    designs: designList,
  };
}
