import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompanyProductPage from "@/components/company/CompanyProductPage";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { ProductDetail } from "@/components/site/ProductDetail";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { productMetadata } from "@/lib/catalog/details";
import { loadProduct, loadPublishedSlugs } from "@/lib/catalog/load";
import { siteUrl } from "@/lib/site";

// The page of one product (spec 002, criteria 57 to 66, 97 to 101), served from the
// cache (tag `catalog`, refreshed by every panel action). The published products'
// pages are built with the deploy; any other slug is rendered on its first visit and
// cached too, so a product published later has its page with no deploy. `params` is
// awaited outside any Suspense, so the product is known before the response starts
// and an unpublished or unknown slug answers a real 404 (criterion 60).

export const instant = false;

export async function generateStaticParams() {
  return (await loadPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Producto no encontrado | Marcando Ando" };
  return productMetadata(product, siteUrl);
}

export default async function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();
  if (product.audience === "empresas") {
    return <CompanyProductPage product={product} />;
  }
  return (
    <>
      <SiteHeader base="/" />
      <main className="flex-1 bg-brand-cream">
        <ProductDetail product={product} />
      </main>
      <SiteFooter />
      <FloatingWhatsapp audience={product.audience} />
    </>
  );
}
