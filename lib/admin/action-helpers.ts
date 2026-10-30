import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { ImageKind } from "./images";

// Pieces shared by the Server Actions of the panel (products and designs).

/**
 * The client of the signed-in admin. Every Server Action checks the admin again
 * and then acts with the admin's own session, so row-level security and the
 * storage policies decide too. The service-role key is never used.
 */
export async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!isAdminUser(user)) redirect("/entrar?error=sin-acceso");
  return supabase;
}

export function formText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

export function imageKindOf(data: FormData): ImageKind {
  return formText(data, "kind") === "graphic" ? "graphic" : "photo";
}

/** The state of a photo form: the error to show, if any. */
export type PhotoFormState = { error: string | null };
