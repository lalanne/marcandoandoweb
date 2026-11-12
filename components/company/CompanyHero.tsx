import { Suspense } from "react";
import { loadCatalog } from "@/lib/catalog/load";
import { PRODUCT_KINDS } from "@/lib/catalog/kind";
import {
  COMPANY_CATEGORIES,
  COMPANY_CTA_TITLE,
  COMPANY_EMPTY,
  COMPANY_EYEBROW,
  COMPANY_INTRO,
  COMPANY_STEPS,
  COMPANY_TITLE,
} from "@/lib/catalog/company-copy";
import { generalWhatsappUrl } from "@/lib/catalog/whatsapp";
import { PacksSection, ProductsSection } from "../site/CatalogSections";
import { corpButtonClass, corpGoldButtonClass, corpOutlineButtonClass } from "./styles";

// "Ver productos" only shows when /empresas has the Productos section.
async function SeeProducts() {
  const { empresas } = await loadCatalog();
  if (empresas.producto.length === 0) return null;
  return (
    <a href="#productos" className={corpOutlineButtonClass}>
      Ver productos
    </a>
  );
}

// The hero of /empresas (spec 002, criterion 106): text only. Per the real-data
// rule there is no photo and no placeholder until Javiera sends one.
export function CompanyHero() {
  return (
    <section aria-labelledby="empresas-title" className="bg-corp-gray px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-widest text-corp-gold-text font-heading">
          {COMPANY_EYEBROW}
        </p>
        <h1
          id="empresas-title"
          className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl"
        >
          {COMPANY_TITLE}
        </h1>
        <div aria-hidden="true" className="mt-5 h-1 w-14 bg-corp-gold" />
        <p className="mt-5 max-w-2xl text-lg">{COMPANY_INTRO}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={generalWhatsappUrl("empresas")} className={corpButtonClass}>
            Cotizar por WhatsApp
          </a>
          <Suspense fallback={null}>
            <SeeProducts />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

// The categories line, the sections, or the "preparing" line when there is no
// published Empresas item, so a link already sent never leads to a blank page
// (spec 002, criteria 72 and 106).
export async function CompanyCatalog() {
  const { empresas } = await loadCatalog();
  if (PRODUCT_KINDS.every((kind) => empresas[kind].length === 0)) {
    return <p className="mx-auto max-w-5xl px-4 py-12 text-lg">{COMPANY_EMPTY}</p>;
  }
  return (
    <>
      <p className="border-b border-corp-line px-4 py-4 text-center text-sm font-semibold font-heading text-corp-navy">
        {COMPANY_CATEGORIES.map((name, i) => (
          <span key={name}>
            {i > 0 ? (
              <span aria-hidden="true" className="px-2 text-corp-gold-text">
                {" · "}
              </span>
            ) : null}
            {name}
          </span>
        ))}
      </p>
      <ProductsSection audience="empresas" />
      <PacksSection audience="empresas" />
    </>
  );
}

export function HowToQuote() {
  return (
    <section id="cotizar" aria-labelledby="cotizar-title" className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 id="cotizar-title" className="text-3xl font-bold">
          Cómo cotizar
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {COMPANY_STEPS.map((step) => (
            <li key={step.number} className="rounded-lg border border-corp-line bg-white p-5">
              <span className="block text-3xl font-extrabold text-corp-gold font-heading">
                {step.number}
              </span>
              <h3 className="mt-2 text-lg font-bold">
                {step.title}
              </h3>
              <p className="mt-1">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section
      aria-labelledby="cta-title"
      className="bg-corp-navy px-4 py-12 text-center text-white [--corp-heading:#fff]"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5">
        <h2 id="cta-title" className="text-2xl font-bold text-white sm:text-3xl">
          {COMPANY_CTA_TITLE}
        </h2>
        <a href={generalWhatsappUrl("empresas")} className={corpGoldButtonClass}>
          Cotizar por WhatsApp
        </a>
      </div>
    </section>
  );
}
