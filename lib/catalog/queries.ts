import type { SupabaseClient } from "@supabase/supabase-js";
import { parseColors, parseSizes } from "./details";
import { groupByKind } from "./group";
import { isProductKind } from "./kind";
import { photosInOrder } from "./photos";
import type {
  Catalog,
  CatalogDesign,
  CatalogProduct,
} from "./types";

type ImageRow = {
  storage_path: string;
  alt_text: string;
  position: number;
};

const PRODUCT_COLUMNS =
  "id, slug, name, description, price_from_clp, kind, is_featured, is_available, colors, sizes, characteristics, image(storage_path, alt_text, position)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCatalogProduct(p: any): CatalogProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceFromClp: p.price_from_clp,
    kind: p.kind,
    isFeatured: p.is_featured,
    isAvailable: p.is_available,
    images: photosInOrder(p.image as ImageRow[]),
    colors: parseColors(p.colors),
    sizes: parseSizes(p.sizes),
    characteristics: typeof p.characteristics === "string" ? p.characteristics : "",
  };
}

/**
 * One published product by its slug, or null when there is none (unpublished
 * products are invisible to the anonymous role, so they are null too). Spec 002,
 * criteria 57 and 60.
 */
export async function getProductBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<CatalogProduct | null> {
  const { data, error } = await client
    .from("product")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !isProductKind(data.kind)) return null;
  return toCatalogProduct(data);
}

/**
 * Whether a published product has this slug. A light check for the proxy, which
 * answers 404 before the page streams (spec 002, criterion 60).
 */
export async function isPublishedSlug(
  client: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("product")
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

/** The slugs of every published product, for the sitemap (spec 002, criterion 61). */
export async function getPublishedSlugs(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from("product")
    .select("slug")
    .eq("is_published", true)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.slug as string);
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
      .select(PRODUCT_COLUMNS)
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
  const productList: CatalogProduct[] = rows.map(toCatalogProduct);

  const designList: CatalogDesign[] = (designs.data ?? []).map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    description: d.description,
    images: photosInOrder(d.image as ImageRow[]),
  }));

  return {
    products: groupByKind(productList),
    designs: designList,
  };
}
