import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/site/CatalogSections";
import { CompanyFooter } from "@/components/company/CompanyFooter";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyCatalog, CompanyHero, CtaBand, HowToQuote } from "@/components/company/CompanyHero";
import { CompanyShell } from "@/components/company/CompanyShell";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { empresasMetadata } from "@/lib/catalog/details";
import { siteUrl } from "@/lib/site";

// The company catalog in its corporate look (spec 002, "Catálogo empresa",
// criteria 71 to 77 and 103 to 109). Like the home page: the hero, "Cómo cotizar"
// and the band are prerendered and the items are read at request time inside
// Suspense, so changes in the panel show without a deploy.
export const metadata: Metadata = empresasMetadata(siteUrl);

export default function EmpresasPage() {
  return (
    <CompanyShell>
      <CompanyHeader />
      <main className="flex-1">
        <CompanyHero />
        <Suspense fallback={<SectionSkeleton />}>
          <CompanyCatalog />
        </Suspense>
        <HowToQuote />
        <CtaBand />
      </main>
      <CompanyFooter />
      <FloatingWhatsapp audience="empresas" />
    </CompanyShell>
  );
}
