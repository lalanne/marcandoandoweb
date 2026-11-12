import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyFooter } from "@/components/company/CompanyFooter";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyShell } from "@/components/company/CompanyShell";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { ProductDetail } from "@/components/site/ProductDetail";
import { productMetadata } from "@/lib/catalog/details";
import { loadProduct } from "@/lib/catalog/load";
import { siteUrl } from "@/lib/site";

// The page of an Empresas item (spec 002, criteria 57 to 66 and 103 to 109). Its
// address is /productos/<slug>: the proxy rewrites it here, so that only the
// company pages load the company fonts (next/font declares them for the whole
// route that imports them, and the people's product page must not, criterion
// 104). Asked for directly, the proxy answers 404.

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/empresa-producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Producto no encontrado | Marcando Ando" };
  return productMetadata(product, siteUrl);
}

export default async function CompanyProductPage({
  params,
}: PageProps<"/empresa-producto/[slug]">) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product || product.audience !== "empresas") notFound();
  return (
    <CompanyShell>
      <CompanyHeader />
      <main className="flex-1 bg-white">
        <ProductDetail product={product} />
      </main>
      <CompanyFooter />
      <FloatingWhatsapp audience="empresas" />
    </CompanyShell>
  );
}
