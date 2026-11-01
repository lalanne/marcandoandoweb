import { cache } from "react";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getCatalog, getProductBySlug } from "./queries";

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
