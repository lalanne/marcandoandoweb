import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesignValues } from "./design-input";
import { GENERIC, IMAGE_COLUMNS, toAdminImages, type AdminImage, type Result } from "./images";

export type { DesignValues } from "./design-input";

// Everything the admin does to designs (the gallery of the "Real work" section).
// Every function takes the client of the signed-in admin: row-level security and
// the storage policies decide, so a client that is not the admin is refused by
// the database. The service-role key is never used. Photos are in `./images`.

export type AdminDesign = DesignValues & { id: string; images: AdminImage[] };

export type DesignListItem = {
  id: string;
  title: string;
  slug: string;
  is_featured: boolean;
  is_published: boolean;
};

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: "slug" };
type Failure = { ok: false; error: string; field?: "slug" };

const DUPLICATE_SLUG =
  "Ya hay un diseño con esa dirección web. Cambia la dirección para que sea distinta.";

function failure(error: { code?: string; message: string }): Failure {
  if (error.code === "23505") return { ok: false, error: DUPLICATE_SLUG, field: "slug" };
  return { ok: false, error: GENERIC };
}

export async function listDesigns(client: SupabaseClient): Promise<DesignListItem[]> {
  const { data, error } = await client
    .from("design")
    .select("id, title, slug, is_featured, is_published")
    .order("title");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDesign(
  client: SupabaseClient,
  id: string,
): Promise<AdminDesign | null> {
  const { data, error } = await client
    .from("design")
    .select(`id, title, slug, description, is_featured, is_published, ${IMAGE_COLUMNS}`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // A malformed id is "not found" for the page, not a crash.
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const { image, ...design } = data as typeof data & {
    image: (AdminImage & { created_at: string })[];
  };
  return { ...design, images: toAdminImages(image) } as AdminDesign;
}

export async function createDesign(
  client: SupabaseClient,
  values: DesignValues,
): Promise<CreateResult> {
  const { data, error } = await client.from("design").insert(values).select("id").single();
  if (error || !data) return failure(error ?? { message: GENERIC });
  return { ok: true, id: data.id };
}

export async function updateDesign(
  client: SupabaseClient,
  id: string,
  values: DesignValues,
): Promise<Result> {
  const { data, error } = await client
    .from("design")
    .update(values)
    .eq("id", id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: GENERIC };
  return { ok: true };
}

/** Deletes the design (its image rows go with it) and then every file it had. */
export async function deleteDesign(client: SupabaseClient, id: string): Promise<Result> {
  const { data: images } = await client
    .from("image")
    .select("storage_path")
    .eq("design_id", id);
  const { data, error } = await client.from("design").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "No se pudo eliminar el diseño. Intenta de nuevo." };
  }
  const paths = (images ?? []).map((i) => i.storage_path as string);
  if (paths.length > 0) {
    const removed = await client.storage.from("images").remove(paths);
    if (removed.error) {
      return {
        ok: false,
        error: "El diseño se eliminó, pero no se pudieron borrar algunas fotos.",
      };
    }
  }
  return { ok: true };
}
