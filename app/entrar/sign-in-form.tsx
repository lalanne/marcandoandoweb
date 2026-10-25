"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

export function SignInForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    { error: initialError },
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-medium">
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-xl border-2 border-brand-night bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-medium">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border-2 border-brand-night bg-white px-3 py-2 font-normal"
        />
      </label>
      {state.error ? (
        <p role="alert" className="font-medium text-red-800">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-2 border-brand-night bg-brand-yellow px-4 py-2 font-semibold text-brand-night disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
