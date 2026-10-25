"use server";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { error: "El correo o la contraseña no son correctos." };
  }
  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel." };
  }
  redirect("/panel");
}
