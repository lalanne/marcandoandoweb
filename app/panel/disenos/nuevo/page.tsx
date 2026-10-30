import type { Metadata } from "next";
import Link from "next/link";
import { DesignForm } from "../design-form";

export const metadata: Metadata = { title: "Nuevo diseño | Panel | Marcando Ando" };

export default function NewDesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <Link href="/panel/disenos" className="underline">
        Volver a los diseños
      </Link>
      <h1 className="text-3xl font-semibold text-brand-night">Nuevo diseño</h1>
      <p>Primero se guarda el diseño; después puedes agregarle fotos.</p>
      <DesignForm
        submitLabel="Guardar diseño"
        initial={{
          title: "",
          slug: "",
          description: "",
          is_featured: false,
          is_published: false,
        }}
      />
    </main>
  );
}
