import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { ProductDetail } from "@/components/site/ProductDetail";
import type { CatalogProduct } from "@/lib/catalog/types";
import { CompanyFooter } from "./CompanyFooter";
import { CompanyHeader } from "./CompanyHeader";
import { CompanyShell } from "./CompanyShell";

/**
 * The page of an Empresas item (spec 002, criteria 57 to 66 and 103 to 109). The
 * product page imports this module only through `import()`, when the product is an
 * Empresas item, so the company fonts (declared by CompanyShell) are not part of a
 * people's product page (criterion 104).
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
