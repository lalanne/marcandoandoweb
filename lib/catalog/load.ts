import { cache } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { CATALOG_CACHE_LIFE, CATALOG_TAG } from "./cache";
import { collectionsWithItems, pickCollection } from "./collection";
import { getCatalog, getProductBySlug } from "./queries";

/**
 * The catalog, read from the cache (spec 002, 2026-11-06 amendment, criteria 97 to
 * 99): the pages that show it are built once, with this read inside them, and a
 * visitor never waits on the database. A save in the panel expires the tag
 * (`refreshCatalog`); anything else shows within an hour. A read that fails
 * throws, so a build that cannot reach the database fails instead of caching an
 * empty catalog (criterion 102). `cache` only dedupes the call inside one render:
 * the header links and the sections share one read.
 */
async function readCatalog() {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife(CATALOG_CACHE_LIFE);
  return getCatalog(createPublicClient());
}
export const loadCatalog = cache(readCatalog);

/** One published product for its page, read at request time; null when unknown. */
export const loadProduct = cache(async (slug: string) => {
  await connection();
  return getProductBySlug(createPublicClient(), slug);
});

/**
 * The catalog and the collection of the home page view (spec 002, criteria 82 to
 * 84): `collection` is null for "Todos", an unknown value, or a collection with no
 * published Personas item. `available` are the collections whose tab is shown.
 * `requested` is the `coleccion` of the address; the page cannot read the address
 * inside the cache, so `/?coleccion=navidad` is rewritten to the prerendered page
 * `/colecciones/navidad` (next.config.ts), which passes it here.
 */
export async function loadCollectionView(requested: string | null | undefined) {
  const catalog = await loadCatalog();
  const available = collectionsWithItems([
    ...catalog.products.producto,
    ...catalog.products.pack,
  ]);
  return { catalog, available, collection: pickCollection(requested ?? undefined, available) };
}
