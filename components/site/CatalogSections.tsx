import Image from "next/image";
import { productPath } from "@/lib/catalog/details";
import { priceLabel, WHOLESALE_NOTE } from "@/lib/catalog/format";
import { imageUrl } from "@/lib/catalog/images";
import type { ProductKind } from "@/lib/catalog/kind";
import { loadCatalog } from "@/lib/catalog/load";
import type { CatalogImage, CatalogProduct } from "@/lib/catalog/types";
import { buttonClass } from "./Hero";
import { PHOTO_SIZES, ProductPhotos } from "./ProductPhotos";

function Photo({ image }: { image: CatalogImage }) {
  return (
    <Image
      src={imageUrl(image.storagePath)}
      alt={image.altText}
      width={600}
      height={450}
      sizes={PHOTO_SIZES}
      loading="lazy"
      className="aspect-[4/3] w-full rounded-2xl border-2 border-brand-night object-cover"
    />
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 border-brand-night bg-white p-3">
      <ProductPhotos images={product.images} name={product.name} />
      <h3 className="text-lg font-semibold">{product.name}</h3>
      {product.priceFromClp !== null && (
        <p className="font-medium">{priceLabel(product.priceFromClp)}</p>
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

async function KindSection({
  kind,
  className,
}: {
  kind: ProductKind;
  className: string;
}) {
  const products = (await loadCatalog()).products[kind];
  if (products.length === 0) return null;
  const { id, title } = KIND_SECTION[kind];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`px-4 py-12 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <h2 id={`${id}-title`} className="text-3xl font-bold">
          {title}
        </h2>
        <p className="mt-2 text-brand-night">{WHOLESALE_NOTE}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductsSection() {
  return <KindSection kind="producto" className="bg-brand-cream" />;
}

export function PacksSection() {
  return <KindSection kind="pack" className="bg-brand-yellow/20" />;
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

export function SectionSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-64 bg-brand-cream" />
  );
}
