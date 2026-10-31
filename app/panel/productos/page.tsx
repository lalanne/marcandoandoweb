import type { Metadata } from "next";
import Link from "next/link";
import { parseKindFilter, productListView, type KindFilter } from "@/lib/admin/product-list";
import { listProducts, type ProductListItem } from "@/lib/admin/products";
import { formatClp } from "@/lib/catalog/format";
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

// Spec 002, criterion 38: the Pack badge, first in its row of badges.
function PackBadge() {
  return (
    <span
      data-testid="pack-badge"
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-night bg-brand-purple-deep px-3 py-0.5 text-sm font-semibold text-white"
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8l9-5 9 5-9 5-9-5z" />
        <path d="M3 13l9 5 9-5" />
        <path d="M3 18l9 5 9-5" />
      </svg>
      Pack
    </span>
  );
}

const FILTERS: { value: KindFilter; label: string; href: string }[] = [
  { value: "todos", label: "Todos", href: "/panel/productos" },
  { value: "producto", label: "Productos", href: "/panel/productos?tipo=producto" },
  { value: "pack", label: "Packs", href: "/panel/productos?tipo=pack" },
];

function ProductRow({ p }: { p: ProductListItem }) {
  const isPack = p.kind === "pack";
  const price = p.price_from_clp === null ? "Sin precio" : formatClp(p.price_from_clp);
  return (
    <li className="flex flex-col gap-2 rounded-2xl border-2 border-brand-night bg-white p-4">
      <Link
        href={`/panel/productos/${p.id}`}
        className="text-lg font-semibold text-brand-night underline"
      >
        {p.name}
      </Link>
      {/* A pack says so with its badge; a product with this word (criterion 32). */}
      <p>{isPack ? price : <><span>Producto</span> · {price}</>}</p>
      <p data-testid="badges" className="flex flex-wrap gap-2">
        {isPack ? <PackBadge /> : null}
        <Badge tone={p.is_published ? "on" : "off"}>
          {p.is_published ? "Publicado" : "Sin publicar"}
        </Badge>
        <Badge tone={p.is_available ? "on" : "off"}>
          {p.is_available ? "Disponible" : "No disponible"}
        </Badge>
        {p.is_featured ? <Badge tone="on">Destacado</Badge> : null}
      </p>
    </li>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; tipo?: string | string[] }>;
}) {
  const { aviso, tipo } = await searchParams;
  const products = await listProducts(await createClient());
  // Spec 002, criteria 39 to 41: counts, the filter from the address, groups.
  const view = productListView(products, parseKindFilter(tipo));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-brand-night">Productos</h1>
        <Link href="/panel/productos/nuevo" className={primaryButton}>
          Nuevo producto
        </Link>
      </div>
      <Notice code={aviso} />
      {/* Plain links: the choice lives in the address, works without
          JavaScript and survives a reload (criteria 40 and 42). */}
      <nav aria-label="Filtrar por tipo">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const current = view.filter === f.value;
            return (
              <li key={f.value}>
                <Link
                  href={f.href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border-2 border-brand-night px-4 py-1.5 font-semibold ${
                    current ? "bg-brand-night text-white" : "bg-white text-brand-night"
                  }`}
                >
                  {f.label} ({view.counts[f.value]})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {view.emptyMessage ? <p>{view.emptyMessage}</p> : null}
      {view.groups.map((group) => (
        <section
          key={group.kind}
          data-testid="product-group"
          aria-labelledby={group.heading ? `grupo-${group.kind}` : undefined}
          aria-label={group.heading ? undefined : group.kind === "pack" ? "Packs" : "Productos"}
          className="flex flex-col gap-3"
        >
          {group.heading ? (
            <h2 id={`grupo-${group.kind}`} className="text-xl font-semibold text-brand-night">
              {group.heading}
            </h2>
          ) : null}
          <ul className="flex flex-col gap-3">
            {group.items.map((p) => (
              <ProductRow key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
