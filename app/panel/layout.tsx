import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Panel | Marcando Ando",
  robots: { index: false, follow: false },
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-6">Cargando...</p>}>
      <AdminOnly>{children}</AdminOnly>
    </Suspense>
  );
}

// The proxy already guards /panel; this checks again on the server so a panel
// page can never render for anyone but the admin.
async function AdminOnly({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!isAdminUser(user)) redirect("/entrar?error=sin-acceso");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-brand-night bg-white px-6 py-3">
        <nav aria-label="Panel" className="flex items-center gap-4 font-semibold">
          <Link href="/panel" className="underline">
            Inicio
          </Link>
          <Link href="/panel/productos" className="underline">
            Productos
          </Link>
          <Link href="/panel/disenos" className="underline">
            Diseños
          </Link>
        </nav>
        <p className="font-semibold">{user.email}</p>
        <form action="/salir" method="post">
          <button
            type="submit"
            className="rounded-xl border-2 border-brand-night bg-brand-cream px-4 py-1 font-semibold"
          >
            Salir
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
