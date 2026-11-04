import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { EMPRESAS_PATH, productUrl } from "@/lib/catalog/details";
import { getPublishedSlugs } from "@/lib/catalog/queries";
import { siteUrl } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

// Spec 002, criteria 61 and 76: the home page, /empresas and the page of every
// published product (Personas and Empresas alike).
// Read at request time, so a new product is listed without a deploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const slugs = await getPublishedSlugs(createPublicClient());
  return [
    { url: siteUrl },
    { url: `${siteUrl.replace(/\/+$/, "")}${EMPRESAS_PATH}` },
    ...slugs.map((slug) => ({ url: productUrl(siteUrl, slug) })),
  ];
}
