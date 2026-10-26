import Link from "next/link";

export default function PanelPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-3xl font-semibold text-brand-night">
        Panel de administración
      </h1>
      <p>Hola. Desde acá manejas lo que se ve en el sitio.</p>
      <Link
        href="/panel/productos"
        className="self-start rounded-xl border-2 border-brand-night bg-brand-yellow px-4 py-2 font-semibold text-brand-night"
      >
        Productos
      </Link>
    </main>
  );
}
