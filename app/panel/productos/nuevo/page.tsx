import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/lib/admin/products";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nuevo producto | Panel | Marcando Ando" };

export default async function NewProductPage() {
  const categories = await listCategories(await createClient());
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <Link href="/panel/productos" className="underline">
        Volver a los productos
      </Link>
      <h1 className="text-3xl font-semibold text-brand-night">Nuevo producto</h1>
      <p>Primero se guarda el producto; después puedes agregarle fotos.</p>
      <ProductForm
        categories={categories}
        submitLabel="Guardar producto"
        initial={{
          name: "",
          slug: "",
          description: "",
          price: "",
          category_id: "",
          is_featured: false,
          is_available: true,
          is_published: false,
        }}
      />
    </main>
  );
}
