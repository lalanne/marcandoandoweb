import { Suspense } from "react";
import {
  ProductsSection,
  RealWorkSection,
  SectionSkeleton,
} from "@/components/site/CatalogSections";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HowToOrder, Schools } from "@/components/site/StaticSections";

// Products and designs are read at request time inside Suspense, so the shell
// (header, hero, how to order, schools, footer) is prerendered and the data
// always reflects the database, with no redeploy.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Suspense fallback={<SectionSkeleton />}>
          <ProductsSection />
        </Suspense>
        <Suspense fallback={null}>
          <RealWorkSection />
        </Suspense>
        <HowToOrder />
        <Schools />
      </main>
      <SiteFooter />
      <FloatingWhatsapp />
    </>
  );
}
