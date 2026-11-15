import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { ProductDetail } from "@/components/site/ProductDetail";
import type { CatalogProduct } from "@/lib/catalog/types";
import { CompanyFooter } from "./CompanyFooter";
import { CompanyHeader } from "./CompanyHeader";
import { CompanyShell } from "./CompanyShell";

/**
 * The page of an Empresas item (spec 002, criteria 57 to 66 and 103 to 109). The
 * product page at /productos/<slug> renders it for an Empresas item; the company
 * fonts are linked by CompanyShell, so a people's item never loads them.
 */
export default function CompanyProductPage({ product }: { product: CatalogProduct }) {
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
