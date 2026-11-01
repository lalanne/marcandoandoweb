import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { ProductDetail } from "@/components/site/ProductDetail";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { productMetadata } from "@/lib/catalog/details";
import { loadProduct } from "@/lib/catalog/load";
import { siteUrl } from "@/lib/site";

// The page of one product (spec 002, criteria 57 to 66). Read at request time, so
// a change in the panel shows without a deploy; an unpublished or unknown slug
// is a 404 (criterion 60).

// The product is read before the page body is sent; the proxy has already
// answered 404 for an unpublished or unknown slug (criterion 60).
export const instant = false;

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
  return (
    <>
      <SiteHeader base="/" />
      <main className="flex-1 bg-brand-cream">
        <ProductDetail product={product} />
      </main>
      <SiteFooter />
      <FloatingWhatsapp />
    </>
  );
}
