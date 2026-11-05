import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { collectionsWithItems, pickCollection } from "./collection";
import { getCatalog, getProductBySlug } from "./queries";

/** What Next gives a page for `?name=value`. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Reads the catalog at request time, so changes in the database show up without a
 * redeploy. Callers must render inside <Suspense> (cacheComponents). `cache`
 * only dedupes the read inside one request: the header links and the sections
 * share one query.
 */
export const loadCatalog = cache(async () => {
  await connection();
  return getCatalog(createPublicClient());
});

/** One published product for its page, read at request time; null when unknown. */
export const loadProduct = cache(async (slug: string) => {
  await connection();
  return getProductBySlug(createPublicClient(), slug);
});

/**
 * The catalog and the collection the visitor chose with `?coleccion=` on the home
 * page (spec 002, criteria 82 to 84): `collection` is null for "Todos", an unknown
 * value, or a collection with no published Personas item. `available` are the
 * collections whose tab is shown. Call it inside <Suspense>: it reads the address.
 */
export async function loadCollectionView(searchParams: SearchParams) {
  const [catalog, params] = await Promise.all([loadCatalog(), searchParams]);
  const available = collectionsWithItems([
    ...catalog.products.producto,
    ...catalog.products.pack,
  ]);
  return { catalog, available, collection: pickCollection(params.coleccion, available) };
}
