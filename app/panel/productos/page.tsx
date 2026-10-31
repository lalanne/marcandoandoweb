import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/admin/products";
import { formatClp } from "@/lib/catalog/format";
import { KIND_LABEL } from "@/lib/catalog/kind";
import { createClient } from "@/lib/supabase/server";
import { Notice, primaryButton } from "../ui";

export const metadata: Metadata = { title: "Productos | Panel | Marcando Ando" };

function Badge({ children, tone }: { children: React.ReactNode; tone: "on" | "off" }) {
  return (
    <span
      className={`rounded-full border-2 border-brand-night px-3 py-0.5 text-sm font-medium ${
        tone === "on" ? "bg-brand-teal/30" : "bg-brand-night/10"
      }`}
    >
      {children}
    </span>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const products = await listProducts(await createClient());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-brand-night">Productos</h1>
        <Link href="/panel/productos/nuevo" className={primaryButton}>
          Nuevo producto
        </Link>
      </div>
      <Notice code={aviso} />
      {products.length === 0 ? (
        <p>Todavía no hay productos. Crea el primero con «Nuevo producto».</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-2xl border-2 border-brand-night bg-white p-4"
            >
              <Link
                href={`/panel/productos/${p.id}`}
                className="text-lg font-semibold text-brand-night underline"
              >
                {p.name}
              </Link>
              <p>
                <span>{KIND_LABEL[p.kind]}</span> ·{" "}
                {p.price_from_clp === null ? "Sin precio" : formatClp(p.price_from_clp)}
              </p>
              <p className="flex flex-wrap gap-2">
                <Badge tone={p.is_published ? "on" : "off"}>
                  {p.is_published ? "Publicado" : "Sin publicar"}
                </Badge>
                <Badge tone={p.is_available ? "on" : "off"}>
                  {p.is_available ? "Disponible" : "No disponible"}
                </Badge>
                {p.is_featured ? <Badge tone="on">Destacado</Badge> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
