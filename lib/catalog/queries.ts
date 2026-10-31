import type { SupabaseClient } from "@supabase/supabase-js";
import { groupByKind } from "./group";
import { isProductKind } from "./kind";
import type {
  Catalog,
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
  const [products, designs] = await Promise.all([
    client
      .from("product")
      .select(
        "id, slug, name, description, price_from_clp, kind, is_featured, is_available, image(storage_path, alt_text, position)",
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

  for (const result of [products, designs]) {
    if (result.error) throw new Error(result.error.message);
  }

  // The database only allows the two types; anything else is not shown.
  const rows = (products.data ?? []).filter((p) => isProductKind(p.kind));
  const productList: CatalogProduct[] = rows.map((p) => {
    const images = ([...(p.image ?? [])] as ImageRow[]).sort(byPosition);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceFromClp: p.price_from_clp,
      kind: p.kind,
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
    products: groupByKind(productList),
    designs: designList,
  };
}
