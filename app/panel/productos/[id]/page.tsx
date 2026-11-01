import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPriceInput } from "@/lib/admin/price";
import { getProduct } from "@/lib/admin/products";
import { createClient } from "@/lib/supabase/server";
import {
  deletePhoto,
  deleteProductAction,
  movePhoto,
  savePhoto,
  uploadPhoto,
} from "../actions";
import { PhotoRow, UploadPhotoForm } from "../../photo-forms";
import { ProductForm } from "../product-form";
import { Notice, dangerButton } from "../../ui";

export const metadata: Metadata = { title: "Editar producto | Panel | Marcando Ando" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const [{ id }, { aviso }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const product = await getProduct(supabase, id);
  if (!product) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Link href="/panel/productos" className="underline">
        Volver a los productos
      </Link>
      <h1 className="text-3xl font-semibold text-brand-night">Editar producto</h1>
      <Notice code={aviso} />

      <ProductForm
        // A new key after each save, so the form shows what is stored.
        key={`${product.id}:${JSON.stringify([product.name, product.slug, product.price_from_clp, product.is_published, product.is_available, product.is_featured, product.kind, product.description, product.colors, product.sizes, product.characteristics])}`}
        productId={product.id}
        submitLabel="Guardar cambios"
        initial={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          price: formatPriceInput(product.price_from_clp),
          kind: product.kind,
          is_featured: product.is_featured,
          is_available: product.is_available,
          is_published: product.is_published,
          colors: product.colors,
          sizes: product.sizes,
          characteristics: product.characteristics,
        }}
      />

      <section aria-labelledby="photos-title" className="flex flex-col gap-4">
        <h2 id="photos-title" className="text-2xl font-semibold text-brand-night">
          Fotos
        </h2>
        <p>
          La primera foto de la lista es la que se ve en la tarjeta del producto.
          Cada foto lleva un texto alternativo en español.
        </p>
        {product.images.length === 0 ? (
          <p>Todavía no hay fotos.</p>
        ) : (
          <ul aria-label="Fotos del producto" className="flex flex-col gap-3">
            {product.images.map((image, index) => (
              <PhotoRow
                key={`${image.id}:${image.alt_text}:${image.kind}`}
                ownerId={product.id}
                actions={{ save: savePhoto, move: movePhoto, remove: deletePhoto }}
                image={image}
                number={index + 1}
                isFirst={index === 0}
                isLast={index === product.images.length - 1}
              />
            ))}
          </ul>
        )}
        <UploadPhotoForm
          key={product.images.length}
          ownerId={product.id}
          upload={uploadPhoto}
        />
      </section>

      <details className="rounded-2xl border-2 border-red-800 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-red-800">
          Eliminar producto
        </summary>
        <form action={deleteProductAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={product.id} />
          <p>
            Se borra «{product.name}» con todas sus fotos. No se puede deshacer.
            Si solo quieres que no se vea en el sitio, desmarca «Publicado».
          </p>
          <button type="submit" className={`${dangerButton} self-start`}>
            Sí, eliminar este producto
          </button>
        </form>
      </details>
    </main>
  );
}
