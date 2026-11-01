import Link from "next/link";
import { backLink, productPageView } from "@/lib/catalog/details";
import type { CatalogProduct } from "@/lib/catalog/types";
import { productWhatsappUrl } from "@/lib/catalog/whatsapp";
import { CopyLinkButton } from "./CopyLinkButton";
import { buttonClass } from "./Hero";
import { ProductPhotos } from "./ProductPhotos";

const secondaryLinkButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border-2 border-brand-night bg-white px-5 py-2 font-semibold text-brand-night";

const headingClass = "text-xl font-semibold";

// The page of one product (spec 002, criteria 57 to 59 and 65). A heading, list
// or row shows only when it has content.
export function ProductDetail({ product }: { product: CatalogProduct }) {
  const view = productPageView(product);
  const back = backLink(product.kind);
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <Link
        href={back.href}
        className="inline-flex min-h-11 items-center self-start font-medium underline"
      >
        {back.label}
      </Link>
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <ProductPhotos images={product.images} name={product.name} />
        <div className="flex flex-col gap-5">
          <h1 className="text-3xl font-bold sm:text-4xl">{product.name}</h1>
          {view.price ? <p className="text-xl font-medium">{view.price}</p> : null}
          {!product.isAvailable ? (
            <p className="rounded-full bg-brand-night/10 px-4 py-2 text-center font-medium">
              no disponible por ahora
            </p>
          ) : null}

          {view.colors.length > 0 ? (
            <section aria-labelledby="colores-title" className="flex flex-col gap-2">
              <h2 id="colores-title" className={headingClass}>
                Colores
              </h2>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {view.colors.map((color, i) => (
                  <li key={`${color.name}-${i}`} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      data-testid="color-swatch"
                      style={{ backgroundColor: color.hex }}
                      className="h-7 w-7 rounded-full border-2 border-brand-night"
                    />
                    <span>{color.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {view.sizes.length > 0 ? (
            <section aria-labelledby="tallas-title" className="flex flex-col gap-2">
              <h2 id="tallas-title" className={headingClass}>
                Tamaños y tallas
              </h2>
              <ul className="flex flex-wrap gap-2">
                {view.sizes.map((size, i) => (
                  <li
                    key={`${size}-${i}`}
                    className="rounded-full border-2 border-brand-night bg-white px-4 py-1 font-medium"
                  >
                    {size}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {view.characteristics.length > 0 ? (
            <section aria-labelledby="caracteristicas-title" className="flex flex-col gap-2">
              <h2 id="caracteristicas-title" className={headingClass}>
                Características
              </h2>
              <ul className="list-disc pl-6">
                {view.characteristics.map((item, i) => (
                  <li key={`${item}-${i}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.description ? <p className="whitespace-pre-line">{product.description}</p> : null}

          <div className="flex flex-wrap items-start gap-3">
            {product.isAvailable ? (
              <a
                href={productWhatsappUrl(product.name)}
                className={`${buttonClass} text-center text-base`}
              >
                Cotizar por WhatsApp
              </a>
            ) : null}
            <CopyLinkButton
              slug={product.slug}
              productName={product.name}
              className={secondaryLinkButton}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
