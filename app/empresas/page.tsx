import type { Metadata } from "next";
import { Suspense } from "react";
import { EmpresasSections, SectionSkeleton } from "@/components/site/CatalogSections";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { buttonClass } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { empresasMetadata } from "@/lib/catalog/details";
import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";
import { siteUrl } from "@/lib/site";

// The company catalog (spec 002, "Catálogo empresa", criteria 71 to 77). Like
// the home page: the heading, intro and button are prerendered and the items are
// read at request time inside Suspense, so changes in the panel show without a
// deploy.
export const metadata: Metadata = empresasMetadata(siteUrl);

export default function EmpresasPage() {
  return (
    <>
      <SiteHeader base="/" current="empresas" />
      <main className="flex-1">
        <section
          aria-labelledby="empresas-title"
          className="bg-brand-cream px-4 pb-6 pt-10 sm:pt-14"
        >
          <div className="mx-auto max-w-5xl">
            <h1 id="empresas-title" className="text-4xl font-bold leading-tight sm:text-5xl">
              Catálogo empresa
            </h1>
            <p className="mt-4 max-w-2xl text-lg sm:text-xl">
              Poleras, polerones, tazones, botellas y regalos con el logo de tu empresa.
              Cotiza por volumen por WhatsApp.
            </p>
            <a href={generalWhatsappUrl("empresas")} className={`${buttonClass} mt-6`}>
              Cotizar por WhatsApp
            </a>
          </div>
        </section>
        <Suspense fallback={<SectionSkeleton />}>
          <EmpresasSections />
        </Suspense>
      </main>
      <SiteFooter />
      <FloatingWhatsapp audience="empresas" />
    </>
  );
}
