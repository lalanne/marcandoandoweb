import type { Metadata } from "next";
import Link from "next/link";
import { listDesigns } from "@/lib/admin/designs";
import { createClient } from "@/lib/supabase/server";
import { Notice, primaryButton } from "../ui";

export const metadata: Metadata = { title: "Diseños | Panel | Marcando Ando" };

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

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const designs = await listDesigns(await createClient());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-brand-night">Diseños</h1>
        <Link href="/panel/disenos/nuevo" className={primaryButton}>
          Nuevo diseño
        </Link>
      </div>
      <p>Los diseños publicados se ven en «Trabajos reales», en el sitio.</p>
      <Notice code={aviso} />
      {designs.length === 0 ? (
        <p>Todavía no hay diseños. Crea el primero con «Nuevo diseño».</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {designs.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 rounded-2xl border-2 border-brand-night bg-white p-4"
            >
              <Link
                href={`/panel/disenos/${d.id}`}
                className="text-lg font-semibold text-brand-night underline"
              >
                {d.title}
              </Link>
              <p className="flex flex-wrap gap-2">
                <Badge tone={d.is_published ? "on" : "off"}>
                  {d.is_published ? "Publicado" : "Sin publicar"}
                </Badge>
                {d.is_featured ? <Badge tone="on">Destacado</Badge> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
