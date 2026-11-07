import Image from "next/image";
import { productPath } from "@/lib/catalog/details";
import type { Audience } from "@/lib/catalog/audience";
import { COMPANY_PRICE_NOTE, priceLabel, WHOLESALE_NOTE } from "@/lib/catalog/format";
import { imageUrl } from "@/lib/catalog/images";
import type { ProductKind } from "@/lib/catalog/kind";
import { COLLECTION_LABEL, listForCollection } from "@/lib/catalog/collection";
import { loadCatalog, loadCollectionView } from "@/lib/catalog/load";
import type { CatalogImage, CatalogProduct } from "@/lib/catalog/types";
import { buttonClass } from "./Hero";
import { ProductPhotos } from "./ProductPhotos";

function Photo({ image }: { image: CatalogImage }) {
  return (
    <Image
      src={imageUrl(image.storagePath)}
      alt={image.altText}
      width={600}
      height={450}
      loading="lazy"
      unoptimized
      className="aspect-[4/3] w-full rounded-2xl border-2 border-brand-night object-cover"
    />
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 border-brand-night bg-white p-3">
      <ProductPhotos images={product.images} name={product.name} />
      <h3 className="text-lg font-semibold">{product.name}</h3>
      {priceLabel(product.priceFromClp, product.audience) !== null && (
        <p className="font-medium">{priceLabel(product.priceFromClp, product.audience)}</p>
      )}
      {!product.isAvailable && (
        <p className="mt-auto rounded-full bg-brand-night/10 px-4 py-2 text-center font-medium">
          no disponible por ahora
        </p>
      )}
      <a
        href={productPath(product.slug)}
        className={`${buttonClass} ${product.isAvailable ? "mt-auto " : ""}text-center text-base`}
      >
        Ver
        <span className="sr-only"> {product.name}</span>
      </a>
    </article>
  );
}

// The anchor and heading of each type's section (spec 002, criteria 33 to 35).
// The header links use the same anchors.
export const KIND_SECTION: Record<ProductKind, { id: string; title: string }> = {
  producto: { id: "productos", title: "Productos" },
  pack: { id: "packs", title: "Packs" },
};

// The Productos and Packs sections of one catalog: the home page lists Personas,
// /empresas lists Empresas, whose sections carry the company note in place of
// prices (spec 002, criteria 68, 71 and 73).
async function KindSection({
  kind,
  audience,
  className,
  collection: requested,
}: {
  kind: ProductKind;
  audience: Audience;
  className: string;
  collection?: string | null;
}) {
  // Only the home page has collections (`null` is "Todos"); /empresas passes none
  // and ignores `?coleccion=`.
  let products: CatalogProduct[];
  if (audience === "empresas" || requested === undefined) {
    const catalog = await loadCatalog();
    products = (audience === "empresas" ? catalog.empresas : catalog.products)[kind];
  } else {
    const { catalog, collection } = await loadCollectionView(requested);
    products = listForCollection(catalog.products, collection)[kind];
  }
  if (products.length === 0) return null;
  const { id, title } = KIND_SECTION[kind];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`px-4 py-12 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <h2 id={`${id}-title`} className="text-3xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-brand-night">
          {audience === "empresas" ? COMPANY_PRICE_NOTE : WHOLESALE_NOTE}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductsSection({
  audience = "personas",
  collection,
}: {
  audience?: Audience;
  collection?: string | null;
}) {
  return (
    <KindSection
      kind="producto"
      audience={audience}
      className="bg-brand-cream"
      collection={collection}
    />
  );
}

export function PacksSection({
  audience = "personas",
  collection,
}: {
  audience?: Audience;
  collection?: string | null;
}) {
  return (
    <KindSection
      kind="pack"
      audience={audience}
      className="bg-brand-yellow/20"
      collection={collection}
    />
  );
}

const tabClass =
  "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border-brand-night py-1.5 pl-2 pr-4 text-base font-semibold leading-tight text-brand-night sm:gap-2 sm:pl-3 sm:pr-5 sm:text-lg";

// Illustration of each tab (spec 002, 2026-11-06 amendment): decorative, 44 px tall
// on phones and 56 px from 640 px up, the same height in every tab.
const TAB_IMAGE: Record<string, { src: string; width: number; height: number }> = {
  todos: { src: "/img/tab-todos.webp", width: 151, height: 112 },
  navidad: { src: "/img/tab-navidad.webp", width: 150, height: 112 },
  escolar: { src: "/img/tab-escolar.webp", width: 152, height: 112 },
};

/**
 * The tabs "Todos", "Especial Navidad" and "Especial Escolar" above the Productos
 * and Packs sections (spec 002, criteria 82 to 87). Plain links that load the home
 * page with the choice in the address, so they work without JavaScript and can be
 * shared. Not shown when no published Personas item is in a collection.
 */
export async function CollectionTabs({ collection: requested }: { collection: string | null }) {
  const { available, collection } = await loadCollectionView(requested);
  if (available.length === 0) return null;
  const tab = (href: string, label: string, chosen: boolean, image: keyof typeof TAB_IMAGE) => (
    <li key={href}>
      <a
        href={href}
        aria-current={chosen ? "page" : undefined}
        className={`${tabClass} ${
          chosen
            ? "border-[3px] bg-brand-yellow-soft shadow-[3px_3px_0_var(--brand-night)]"
            : "border-2 bg-white hover:bg-brand-yellow/40"
        }`}
      >
        <Image
          src={TAB_IMAGE[image].src}
          alt=""
          width={TAB_IMAGE[image].width}
          height={TAB_IMAGE[image].height}
          priority
          unoptimized
          className="h-11 w-auto shrink-0 sm:h-14"
        />
        {/* On phones a two-word label wraps inside its pill so two pills fit a row. */}
        <span className="max-sm:w-min">{label}</span>
      </a>
    </li>
  );
  return (
    <div className="bg-brand-cream px-4 pt-8">
      <nav aria-label="Colecciones" id="colecciones" className="mx-auto max-w-5xl">
        <ul className="flex flex-wrap gap-3">
          {tab("/", "Todos", collection === null, "todos")}
          {available.map((c) =>
            tab(`/?coleccion=${c}#colecciones`, COLLECTION_LABEL[c], collection === c, c),
          )}
        </ul>
      </nav>
    </div>
  );
}

/**
 * Both company sections, or the "preparing" line when there is no published
 * Empresas item, so a link already sent never leads to a blank page
 * (spec 002, criterion 72).
 */
export async function EmpresasSections() {
  const { producto, pack } = (await loadCatalog()).empresas;
  if (producto.length === 0 && pack.length === 0) {
    return (
      <p className="mx-auto max-w-5xl px-4 py-12 text-lg">
        Estamos preparando el catálogo para empresas. Escríbenos y te contamos.
      </p>
    );
  }
  return (
    <>
      <ProductsSection audience="empresas" />
      <PacksSection audience="empresas" />
    </>
  );
}

export async function RealWorkSection() {
  const { designs } = await loadCatalog();
  if (designs.length === 0) return null;
  return (
    <section
      id="trabajos"
      aria-labelledby="trabajos-title"
      className="bg-brand-teal/20 px-4 py-12"
    >
      <div className="mx-auto max-w-5xl">
        <h2 id="trabajos-title" className="text-3xl font-bold">
          Trabajos reales
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <article
              key={design.id}
              className="flex flex-col gap-3 rounded-3xl border-2 border-brand-night bg-white p-3"
            >
              {design.images.map((image) => (
                <Photo key={image.storagePath} image={image} />
              ))}
              <h3 className="text-lg font-semibold">{design.title}</h3>
              {design.description && <p>{design.description}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
