import Image from "next/image";
import { Suspense } from "react";
import {
  DEFAULT_HEADER_LINK,
  headerLinkFor,
  type HeaderLink,
} from "@/lib/auth/header-link";
import { PRODUCT_KINDS } from "@/lib/catalog/kind";
import { loadCatalog } from "@/lib/catalog/load";
import { KIND_SECTION } from "./CatalogSections";
import { createClient } from "@/lib/supabase/server";
import logo from "@/public/img/logo.webp";

const linkClass =
  "rounded-full px-3 py-1 text-sm font-medium hover:bg-brand-yellow/40";

// "Productos" and "Packs" only show when their section exists, so no link points
// at a hidden section (spec 002, criteria 34 and 35). There is no link to the
// "Trabajos reales" section (owner decision, 2026-10-31).
async function CatalogLinks({ base }: { base: string }) {
  const { products } = await loadCatalog();
  return (
    <>
      {PRODUCT_KINDS.filter((kind) => products[kind].length > 0).map((kind) => (
        <li key={kind}>
          <a className={linkClass} href={`${base}#${KIND_SECTION[kind].id}`}>
            {KIND_SECTION[kind].title}
          </a>
        </li>
      ))}
    </>
  );
}

// Same box for both labels (fixed width, same classes), so the header does not
// shift when "Entrar" turns into "Mi panel".
const accountLinkClass =
  "inline-block w-24 rounded-full border-2 border-brand-night bg-brand-yellow px-3 py-1 text-center text-sm font-semibold hover:bg-brand-yellow/70";

function AccountLink({ link }: { link: HeaderLink }) {
  return (
    <a className={accountLinkClass} href={link.href}>
      {link.label}
    </a>
  );
}

// Reads the session at request time (getUser asks the auth server, so a forged
// token does not count). Any failure shows "Entrar". Only this part is dynamic;
// the rest of the header stays prerendered.
async function SessionLink() {
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
  return <AccountLink link={link} />;
}

// `base` is "" on the home page (the links are anchors on the page) and "/" on
// other pages (the links go to the home page's sections).
export function SiteHeader({ base = "" }: { base?: string }) {
  return (
    <header className="border-b-2 border-brand-night bg-brand-cream">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <a href={`${base}#inicio`} className="shrink-0 rounded-xl">
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
              <CatalogLinks base={base} />
            </Suspense>
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
    </header>
  );
}
