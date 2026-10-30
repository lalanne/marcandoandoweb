import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDesign } from "@/lib/admin/designs";
import { createClient } from "@/lib/supabase/server";
import { PhotoRow, UploadPhotoForm } from "../../photo-forms";
import { Notice, dangerButton } from "../../ui";
import {
  deleteDesignAction,
  deletePhoto,
  movePhoto,
  savePhoto,
  uploadPhoto,
} from "../actions";
import { DesignForm } from "../design-form";

export const metadata: Metadata = { title: "Editar diseño | Panel | Marcando Ando" };

export default async function EditDesignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const [{ id }, { aviso }] = await Promise.all([params, searchParams]);
  const design = await getDesign(await createClient(), id);
  if (!design) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Link href="/panel/disenos" className="underline">
        Volver a los diseños
      </Link>
      <h1 className="text-3xl font-semibold text-brand-night">Editar diseño</h1>
      <Notice code={aviso} />

      <DesignForm
        // A new key after each save, so the form shows what is stored.
        key={`${design.id}:${JSON.stringify([design.title, design.slug, design.is_published, design.is_featured, design.description])}`}
        designId={design.id}
        submitLabel="Guardar cambios"
        initial={{
          title: design.title,
          slug: design.slug,
          description: design.description ?? "",
          is_featured: design.is_featured,
          is_published: design.is_published,
        }}
      />

      <section aria-labelledby="photos-title" className="flex flex-col gap-4">
        <h2 id="photos-title" className="text-2xl font-semibold text-brand-night">
          Fotos
        </h2>
        <p>
          Las fotos se ven en el sitio en este orden. Cada foto lleva un texto
          alternativo en español.
        </p>
        {design.images.length === 0 ? (
          <p>Todavía no hay fotos.</p>
        ) : (
          <ul aria-label="Fotos del diseño" className="flex flex-col gap-3">
            {design.images.map((image, index) => (
              <PhotoRow
                key={`${image.id}:${image.alt_text}:${image.kind}`}
                ownerId={design.id}
                actions={{ save: savePhoto, move: movePhoto, remove: deletePhoto }}
                image={image}
                number={index + 1}
                isFirst={index === 0}
                isLast={index === design.images.length - 1}
              />
            ))}
          </ul>
        )}
        <UploadPhotoForm
          key={design.images.length}
          ownerId={design.id}
          upload={uploadPhoto}
        />
      </section>

      <details className="rounded-2xl border-2 border-red-800 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-red-800">
          Eliminar diseño
        </summary>
        <form action={deleteDesignAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={design.id} />
          <p>
            Se borra «{design.title}» con todas sus fotos. No se puede deshacer.
            Si solo quieres que no se vea en el sitio, desmarca «Publicado».
          </p>
          <button type="submit" className={`${dangerButton} self-start`}>
            Sí, eliminar este diseño
          </button>
        </form>
      </details>
    </main>
  );
}
