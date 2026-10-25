import Image from "next/image";
import { formatClp } from "@/lib/catalog/format";
import { publicImageUrl } from "@/lib/catalog/images";
import { loadCatalog } from "@/lib/catalog/load";
import type { CatalogImage, CatalogProduct } from "@/lib/catalog/types";
import { productWhatsappUrl } from "@/lib/catalog/whatsapp";
import { buttonClass } from "./Hero";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function Photo({ image }: { image: CatalogImage }) {
  return (
    <Image
      src={publicImageUrl(SUPABASE_URL, image.storagePath)}
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
      {product.coverImage ? (
        <Photo image={product.coverImage} />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-[4/3] w-full rounded-2xl border-2 border-brand-night bg-brand-teal/30"
        />
      )}
      <h4 className="text-lg font-semibold">{product.name}</h4>
      {product.priceFromClp !== null && (
        <p className="font-medium">desde {formatClp(product.priceFromClp)}</p>
      )}
      {product.isAvailable ? (
        <a
          href={productWhatsappUrl(product.name)}
          className={`${buttonClass} mt-auto text-center text-base`}
        >
          Cotizar
          <span className="sr-only"> {product.name}</span>
        </a>
      ) : (
        <p className="mt-auto rounded-full bg-brand-night/10 px-4 py-2 text-center font-medium">
          no disponible por ahora
        </p>
      )}
    </article>
  );
}

export async function ProductsSection() {
  const { sections } = await loadCatalog();
  if (sections.length === 0) return null;
  return (
    <section
      id="productos"
      aria-labelledby="productos-title"
      className="bg-brand-cream px-4 py-12"
    >
      <div className="mx-auto max-w-5xl">
        <h2 id="productos-title" className="text-3xl font-bold">
          Productos
        </h2>
        {sections.map(({ category, products }) => (
          <div key={category.id} className="mt-8">
            <h3 className="text-2xl font-semibold">{category.name}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
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

export function SectionSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-64 bg-brand-cream" />
  );
}
