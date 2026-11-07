import {
  CollectionTabs,
  PacksSection,
  ProductsSection,
  RealWorkSection,
} from "@/components/site/CatalogSections";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HowToOrder, Schools } from "@/components/site/StaticSections";

/**
 * The home page and its collection views (spec 002, criteria 82 to 89).
 *
 * The catalog is read from the cache (lib/catalog/load.ts), so the whole page,
 * header links and sections included, is built once and served without a database
 * read; only the header's session link is per request. The page cannot read
 * `?coleccion=` inside the cache, so each view is its own prerendered page:
 * `/` is "Todos" (`collection` null) and `/colecciones/navidad` and
 * `/colecciones/escolar` are the views `/?coleccion=navidad` and
 * `/?coleccion=escolar` are rewritten to (next.config.ts). The visitor only ever
 * sees the first addresses.
 */
export function HomeView({ collection }: { collection: string | null }) {
  return (
    <>
      <SiteHeader collection={collection} />
      <main className="flex-1">
        <Hero />
        <CollectionTabs collection={collection} />
        <ProductsSection collection={collection} />
        <PacksSection collection={collection} />
        <RealWorkSection />
        <HowToOrder />
        <Schools />
      </main>
      <SiteFooter />
      <FloatingWhatsapp />
    </>
  );
}
