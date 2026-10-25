import Image from "next/image";
import { Suspense } from "react";
import { loadCatalog } from "@/lib/catalog/load";
import logo from "@/public/img/logo.webp";

const linkClass =
  "rounded-full px-3 py-1 text-sm font-medium hover:bg-brand-yellow/40";

// Links to the sections that depend on the database only show when the section
// exists, so no link points at a hidden section.
async function CatalogLinks() {
  const { sections, designs } = await loadCatalog();
  return (
    <>
      {sections.length > 0 && (
        <li>
          <a className={linkClass} href="#productos">
            Productos
          </a>
        </li>
      )}
      {designs.length > 0 && (
        <li>
          <a className={linkClass} href="#trabajos">
            Trabajos
          </a>
        </li>
      )}
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b-2 border-brand-night bg-brand-cream">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <a href="#inicio" className="shrink-0 rounded-xl">
          <Image
            src={logo}
            alt="Marcando Ando, logo con una polera rosada con una M y un tazón morado"
            priority
            sizes="120px"
            className="h-14 w-auto"
          />
        </a>
        <nav aria-label="Secciones">
          <ul className="flex flex-wrap items-center">
            <Suspense fallback={null}>
              <CatalogLinks />
            </Suspense>
            <li>
              <a className={linkClass} href="#como-pedir">
                Cómo pedir
              </a>
            </li>
            <li>
              <a className={linkClass} href="#colegios">
                Colegios y grupos
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
