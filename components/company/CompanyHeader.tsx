import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_HEADER_LINK } from "@/lib/auth/header-link";
import { EMPRESAS_PATH } from "@/lib/catalog/details";
import { PRODUCT_KINDS } from "@/lib/catalog/kind";
import { loadCatalog } from "@/lib/catalog/load";
import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";
import { KIND_SECTION } from "../site/CatalogSections";
import { SessionLink } from "../site/SiteHeader";
import { corpAccountLinkClass } from "./styles";

const linkBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-semibold font-heading hover:bg-corp-gray";
const linkClass = `${linkBase} text-corp-navy`;
const mutedLinkClass = `${linkBase} text-corp-muted`;
const whatsappClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-corp-navy bg-corp-navy px-4 text-sm font-semibold font-heading text-white hover:bg-corp-navy-deep";

// "Productos" and "Packs" only show when /empresas has that section, so no link
// points at a hidden one (spec 002, criterion 105).
async function SectionLinks() {
  const { empresas } = await loadCatalog();
  return (
    <>
      {PRODUCT_KINDS.filter((kind) => empresas[kind].length > 0).map((kind) => (
        <li key={kind}>
          <a className={linkClass} href={`${EMPRESAS_PATH}#${KIND_SECTION[kind].id}`}>
            {KIND_SECTION[kind].title}
          </a>
        </li>
      ))}
    </>
  );
}

// The header of the company pages (spec 002, criterion 105): white, a 1 px
// bottom line, the company logo, its own links and the sign-in link.
export function CompanyHeader() {
  return (
    <header className="border-b border-corp-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <a href={EMPRESAS_PATH} className="flex min-h-11 shrink-0 items-center rounded-md">
          <Image
            src="/img/logo-empresas.webp"
            alt="Marcando Ando, soluciones corporativas"
            width={600}
            height={125}
            priority
            unoptimized
            className="h-7 w-auto md:h-10"
          />
        </a>
        <nav aria-label="Secciones">
          <ul className="flex flex-wrap items-center gap-x-1">
            <Suspense fallback={null}>
              <SectionLinks />
            </Suspense>
            <li>
              <a className={linkClass} href={`${EMPRESAS_PATH}#cotizar`}>
                Cómo cotizar
              </a>
            </li>
            <li>
              <Link className={mutedLinkClass} href="/">
                Web para personas
              </Link>
            </li>
            <li>
              <a className={whatsappClass} href={generalWhatsappUrl("empresas")}>
                Cotizar por WhatsApp
              </a>
            </li>
            <li className="ml-1">
              <Suspense fallback={<a className={corpAccountLinkClass} href={DEFAULT_HEADER_LINK.href}>{DEFAULT_HEADER_LINK.label}</a>}>
                <SessionLink corp />
              </Suspense>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
