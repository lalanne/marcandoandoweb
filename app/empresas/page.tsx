
import type { Metadata } from "next";
import { CompanyFooter } from "@/components/company/CompanyFooter";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyCatalog, CompanyHero, CtaBand, HowToQuote } from "@/components/company/CompanyHero";
import { CompanyShell } from "@/components/company/CompanyShell";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { empresasMetadata } from "@/lib/catalog/details";
import { siteUrl } from "@/lib/site";

// The company catalog in its corporate look (spec 002, "Catálogo empresa",
// criteria 71 to 77 and 103 to 109). Like the home page, the whole page is
// prerendered with the items read from the cache (spec 002, criteria 97 to 99),
// and a save in the panel refreshes it. Only the header's session link is per request.
export const metadata: Metadata = empresasMetadata(siteUrl);

export default function EmpresasPage() {
  return (
    <CompanyShell>
      <CompanyHeader />
      <main className="flex-1">
        <CompanyHero />
        <CompanyCatalog />
        <HowToQuote />
        <CtaBand />
      </main>
      <CompanyFooter />
      <FloatingWhatsapp audience="empresas" />
    </CompanyShell>
  );
}
