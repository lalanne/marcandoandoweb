import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Entrar | Marcando Ando",
  robots: { index: false, follow: false },
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border-2 border-brand-night bg-white p-6">
        <h1 className="mb-6 text-3xl font-semibold text-brand-night">Entrar</h1>
        {/* Reads the session and the URL, so it streams in at request time. */}
        <Suspense fallback={<p>Cargando...</p>}>
          <SignInContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignInContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (isAdminUser(user)) redirect("/panel");

  return (
    <SignInForm
      initialError={
        error === "sin-acceso" ? "Esta cuenta no tiene acceso al panel." : null
      }
    />
  );
}
