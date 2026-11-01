import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { productUrl } from "@/lib/catalog/details";
import { getPublishedSlugs } from "@/lib/catalog/queries";
import { siteUrl } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

// Spec 002, criterion 61: the home page and the page of every published product.
// Read at request time, so a new product is listed without a deploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const slugs = await getPublishedSlugs(createPublicClient());
  return [
    { url: siteUrl },
    ...slugs.map((slug) => ({ url: productUrl(siteUrl, slug) })),
  ];
}
