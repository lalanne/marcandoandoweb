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

const ERROR_TEXTS: Record<string, string> = {
  "sin-acceso": "Esta cuenta no tiene acceso al panel.",
  google:
    "No pudimos entrar con Google. Inténtalo de nuevo o usa tu correo y contraseña.",
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
    <>
      <SignInForm initialError={ERROR_TEXTS[error ?? ""] ?? null} />
      <div className="my-5 flex items-center gap-3 text-brand-night">
        <hr className="flex-1 border-brand-night/30" />
        <span>o</span>
        <hr className="flex-1 border-brand-night/30" />
      </div>
      {/* A plain form POST: a full-page navigation that works without JavaScript
          and cannot be started by a link prefetch. */}
      <form method="post" action="/auth/google">
        <button
          type="submit"
          className="w-full rounded-xl border-2 border-brand-night bg-white px-4 py-2 font-semibold text-brand-night"
        >
          Continuar con Google
        </button>
      </form>
    </>
  );
}
