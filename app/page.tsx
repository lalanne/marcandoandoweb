import { Suspense } from "react";
import {
  CollectionTabs,
  PacksSection,
  ProductsSection,
  RealWorkSection,
  SectionSkeleton,
} from "@/components/site/CatalogSections";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { SearchParams } from "@/lib/catalog/load";
import { HowToOrder, Schools } from "@/components/site/StaticSections";

// Products and designs are read at request time inside Suspense, so the shell
// (header, hero, how to order, schools, footer) is prerendered and the data
// always reflects the database, with no redeploy. `?coleccion=` (the collection
// tabs, spec 002 criteria 82 to 89) is read only inside those Suspense boundaries,
// as a promise, so it does not make the shell dynamic.
export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader searchParams={searchParams} />
      <main className="flex-1">
        <Hero />
        <Suspense fallback={null}>
          <CollectionTabs searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ProductsSection searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <PacksSection searchParams={searchParams} />
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
