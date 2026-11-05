import type { Metadata } from "next";
import type { Audience } from "./audience";
import { priceLabel } from "./format";
import { imageUrl } from "./images";
import type { ProductKind } from "./kind";
import type { CatalogColor, CatalogProduct } from "./types";

// The page of a product (spec 002, criteria 56 to 66). Pure, so what the page
// shows, the shared address and the preview tags are unit tested.

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Colors from the database list; anything malformed is dropped, order kept. */
export function parseColors(value: unknown): CatalogColor[] {
  if (!Array.isArray(value)) return [];
  const colors: CatalogColor[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const { name, hex } = item as Record<string, unknown>;
    if (typeof name === "string" && name !== "" && typeof hex === "string" && HEX.test(hex)) {
      colors.push({ name, hex });
    }
  }
  return colors;
}

/** Size labels from the database list; order kept. */
export function parseSizes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v !== "");
}

/** One item per non-empty line of the characteristics text. */
export function characteristicsItems(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** What the page shows; a part with no content is empty, so it gets no heading. */
export function productPageView(product: CatalogProduct) {
  return {
    price: priceLabel(product.priceFromClp, product.audience),
    colors: product.colors,
    sizes: product.sizes,
    characteristics: characteristicsItems(product.characteristics),
  };
}

/** The page of the company catalog (spec 002, "Catálogo empresa"). */
export const EMPRESAS_PATH = "/empresas";

export function productPath(slug: string): string {
  return `/productos/${encodeURIComponent(slug)}`;
}

/** The address Javiera shares: `https://<site>/productos/<slug>`. */
export function productUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, "")}${productPath(slug)}`;
}

/** The link back to the section of the product's type in its catalog. */
export function backLink(
  kind: ProductKind,
  audience: Audience = "personas",
): { label: string; href: string } {
  if (audience === "empresas") {
    return {
      label: "Volver a catálogo empresa",
      href: `${EMPRESAS_PATH}#${kind === "pack" ? "packs" : "productos"}`,
    };
  }
  return kind === "pack"
    ? { label: "Volver a packs", href: "/#packs" }
    : { label: "Volver a productos", href: "/#productos" };
}

/** Title, description, canonical address and Open Graph tags of a product page. */
export function productMetadata(product: CatalogProduct, origin: string): Metadata {
  const title = `${product.name} | Marcando Ando`;
  const price = priceLabel(product.priceFromClp, product.audience);
  const what = product.kind === "pack" ? "pack" : "producto";
  const description = `${product.name}: ${what} personalizado en Marcando Ando.${
    price ? ` ${price}.` : ""
  } Cotiza por WhatsApp.`;
  const url = productUrl(origin, product.slug);
  const cover = product.images[0];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "es_CL",
      siteName: "Marcando Ando",
      ...(cover
        ? {
            images: [
              {
                url: `${origin.replace(/\/+$/, "")}${imageUrl(cover.storagePath)}`,
                alt: cover.altText,
              },
            ],
          }
        : {}),
    },
  };
}

const EMPRESAS_TITLE = "Catálogo empresa | Marcando Ando";
const EMPRESAS_DESCRIPTION =
  "Poleras, polerones, tazones, botellas y regalos con el logo de tu empresa. Cotiza por volumen por WhatsApp.";

/** Title, description, canonical address and Open Graph tags of /empresas (criterion 76). */
export function empresasMetadata(origin: string): Metadata {
  const url = `${origin.replace(/\/+$/, "")}${EMPRESAS_PATH}`;
  return {
    title: EMPRESAS_TITLE,
    description: EMPRESAS_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      title: EMPRESAS_TITLE,
      description: EMPRESAS_DESCRIPTION,
      url,
      type: "website",
      locale: "es_CL",
      siteName: "Marcando Ando",
    },
  };
}
