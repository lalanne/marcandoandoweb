import Image from "next/image";
import { Suspense, type ReactNode } from "react";
import {
  DEFAULT_HEADER_LINK,
  headerLinkFor,
  type HeaderLink,
} from "@/lib/auth/header-link";
import { EMPRESAS_PATH } from "@/lib/catalog/details";
import { PRODUCT_KINDS } from "@/lib/catalog/kind";
import { loadCatalog, loadCollectionView, type SearchParams } from "@/lib/catalog/load";
import { KIND_SECTION } from "./CatalogSections";
import { corpAccountLinkClass } from "../company/styles";
import { createClient } from "@/lib/supabase/server";
import logo from "@/public/img/logo.webp";

const linkBase = "rounded-full px-2 text-sm font-medium hover:bg-brand-yellow/40 sm:px-3";
const linkClass = `${linkBase} py-1`;

// The link to the company catalog: same place, size, typeface and pill shape,
// plus a 2 px navy outline, navy text and a briefcase before the text.
// No vertical padding: the 2 px border and the 20 px line make a 24 px box, as tall
// as the other links' line, so the header does not grow when the links stream in.
const companyLinkClass = `${linkBase} flex items-center gap-1.5 border-2 border-corp-navy text-corp-navy`;

// "Productos" and "Packs" only show when their section exists, so no link points
// at a hidden section (spec 002, criteria 34 and 35). There is no link to the
// "Trabajos reales" section (owner decision, 2026-10-31).
// "Catálogo empresa" goes after "Packs" and only shows when an Empresas item is
// published (spec 002, criteria 69 and 70). It has a navy outline and a briefcase
// icon (criterion 110). The company pages have their own header.
// On the home page with a special collection chosen, "Productos" and "Packs" lead to
// the sections of the page without `coleccion` (spec 002, criterion 89).
async function CatalogLinks({
  base: pageBase,
  searchParams,
}: {
  base: string;
  searchParams?: SearchParams;
}) {
  const { products, empresas } = await loadCatalog();
  const onCollection = searchParams
    ? (await loadCollectionView(searchParams)).collection !== null
    : false;
  const base = onCollection ? "/" : pageBase;
  const hasEmpresas = PRODUCT_KINDS.some((kind) => empresas[kind].length > 0);
  return (
    <>
      {PRODUCT_KINDS.filter((kind) => products[kind].length > 0).map((kind) => (
        <li key={kind}>
          <a className={linkClass} href={`${base}#${KIND_SECTION[kind].id}`}>
            {KIND_SECTION[kind].title}
          </a>
        </li>
      ))}
      {hasEmpresas ? (
        <li>
          <a className={companyLinkClass} href={EMPRESAS_PATH}>
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <path d="M2 13h20" />
            </svg>
            Catálogo empresa
          </a>
        </li>
      ) : null}
    </>
  );
}

// The company logo after the people's logo, with a thin line between them (spec 002,
// criterion 112). Only when an Empresas item is published, the same rule as the
// "Catálogo empresa" link (criteria 70 and 114).
function CompanyLogoLink() {
  return (
    <>
      <span
        aria-hidden="true"
        className="logo-divider h-11 w-px shrink-0 bg-brand-night/35 md:h-14"
      />
      <a href={EMPRESAS_PATH} className="flex min-h-11 shrink-0 items-center rounded-md">
        <Image
          src="/img/logo-empresas.webp"
          alt="Marcando Ando, soluciones corporativas"
          width={600}
          height={125}
          priority
          unoptimized
          className="h-8 w-auto md:h-10"
        />
      </a>
    </>
  );
}

// Same box for both labels (fixed width, same classes), so the header does not
// shift when "Entrar" turns into "Mi panel".
const accountLinkClass =
  "inline-block w-24 rounded-full border-2 border-brand-night bg-brand-yellow px-3 py-1 text-center text-sm font-semibold hover:bg-brand-yellow/70";

function AccountLink({ link, corp = false }: { link: HeaderLink; corp?: boolean }) {
  return (
    <a className={corp ? corpAccountLinkClass : accountLinkClass} href={link.href}>
      {link.label}
    </a>
  );
}

// Reads the session at request time (getUser asks the auth server, so a forged
// token does not count). Any failure shows "Entrar". Only this part is dynamic;
// the rest of the header stays prerendered.
export async function SessionLink({ corp = false }: { corp?: boolean }) {
  // Outside the try: it opts the component into request time, and a catch must
  // not swallow that signal.
  const supabase = await createClient();
  let link = DEFAULT_HEADER_LINK;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    link = headerLinkFor(user);
  } catch {
    // Unreadable session: keep the visitor link.
  }
  return <AccountLink link={link} corp={corp} />;
}

// The header's content. With an Empresas item published (`hasEmpresas`) the company
// logo follows the people's logo and the menu always goes on a row of its own
// (spec 002, criterion 112: the logos and the five links do not fit on one row), so
// the header has the same height before and after the catalog streams in (criteria
// 67 and 115). Without one, the menu keeps its place as before (criterion 114).
function HeaderBar({
  base,
  hasEmpresas,
  companyLogo,
  catalogLinks,
}: {
  base: string;
  hasEmpresas: boolean;
  companyLogo: ReactNode;
  catalogLinks: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
      <div className="flex shrink-0 items-center gap-3">
        <a href={`${base}#inicio`} className="shrink-0 rounded-xl">
          <Image
            src={logo}
            alt="Marcando Ando, logo con una polera rosada con una M y un tazón morado"
            priority
            sizes="(min-width: 768px) 352px, 280px"
            className="h-16 w-auto md:h-20"
          />
        </a>
        {companyLogo}
      </div>
      <nav aria-label="Secciones" className={hasEmpresas ? "basis-full" : undefined}>
        <ul className="flex min-h-14 flex-wrap items-center sm:min-h-0">
          {catalogLinks}
          <li>
            <a className={linkClass} href={`${base}#como-pedir`}>
              Cómo pedir
            </a>
          </li>
          <li>
            <a className={linkClass} href={`${base}#colegios`}>
              Colegios y grupos
            </a>
          </li>
          <li className="ml-1">
            <Suspense fallback={<AccountLink link={DEFAULT_HEADER_LINK} />}>
              <SessionLink />
            </Suspense>
          </li>
        </ul>
      </nav>
    </div>
  );
}

async function LoadedHeaderBar({
  base,
  searchParams,
}: {
  base: string;
  searchParams?: SearchParams;
}) {
  const { empresas } = await loadCatalog();
  const hasEmpresas = PRODUCT_KINDS.some((kind) => empresas[kind].length > 0);
  return (
    <HeaderBar
      base={base}
      hasEmpresas={hasEmpresas}
      companyLogo={hasEmpresas ? <CompanyLogoLink /> : null}
      catalogLinks={
        <Suspense fallback={null}>
          <CatalogLinks base={base} searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}

// `base` is "" on the home page (the links are anchors on the page) and "/" on
// other pages (the links go to the home page's sections). Until the catalog loads,
// the header shows the people's logo and the fixed links, laid out as it will be
// with Empresas items (the usual case), so it keeps its height.
export function SiteHeader({
  base = "",
  searchParams,
}: {
  base?: string;
  searchParams?: SearchParams;
}) {
  return (
    <header className="border-b-2 border-brand-night bg-brand-cream">
      <Suspense
        fallback={<HeaderBar base={base} hasEmpresas companyLogo={null} catalogLinks={null} />}
      >
        <LoadedHeaderBar base={base} searchParams={searchParams} />
      </Suspense>
    </header>
  );
}
