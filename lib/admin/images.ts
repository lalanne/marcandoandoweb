import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_TYPE_ERROR,
  buildDesignImagePath,
  buildProductImagePath,
  validateAltText,
  validateImageFile,
} from "./image-upload";
import { PHOTO_CONTENT_TYPE, resizePhoto } from "./resize-image";

// The photos of products and designs: the same rules for both owners. Every
// function takes the client of the signed-in admin: row-level security and the
// storage policies decide, so a client that is not the admin is refused by the
// database. The service-role key is never used.

export type ImageKind = "photo" | "graphic";

export type AdminImage = {
  id: string;
  storage_path: string;
  alt_text: string;
  kind: ImageKind;
  position: number;
};

/** Who a photo belongs to; the column and the storage folder follow from it. */
export type ImageOwner = { kind: "product" | "design"; id: string };

export type Result =
  | { ok: true }
  | { ok: false; error: string; field?: "slug" };

export const GENERIC = "No se pudo guardar. Intenta de nuevo.";

/** The columns to select so `toAdminImages` can order and map the photos. */
export const IMAGE_COLUMNS = "image(id, storage_path, alt_text, kind, position, created_at)";

/** Photos as the admin sees them: by position, then by age. */
export function toAdminImages(
  rows: (AdminImage & { created_at: string })[] | null,
): AdminImage[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map((i) => ({
      id: i.id,
      storage_path: i.storage_path,
      alt_text: i.alt_text,
      kind: i.kind,
      position: i.position,
    }));
}

const ownerColumn = (owner: ImageOwner) =>
  owner.kind === "product" ? "product_id" : "design_id";

export async function addImage(
  client: SupabaseClient,
  input: {
    owner: ImageOwner;
    file: { type: string; size: number; body: Blob | Uint8Array };
    altText: string;
    kind: ImageKind;
  },
): Promise<Result> {
  const altText = input.altText.trim();
  const problem = validateAltText(altText) ?? validateImageFile(input.file);
  if (problem) return { ok: false, error: problem };

  // Stored resized, as WebP (issue #98): the phone's original is 1.5 to 3 MB.
  const bytes =
    input.file.body instanceof Uint8Array
      ? input.file.body
      : new Uint8Array(await input.file.body.arrayBuffer());
  const resized = await resizePhoto(bytes);
  if (!resized) return { ok: false, error: IMAGE_TYPE_ERROR };

  const column = ownerColumn(input.owner);
  const { data: last, error: lastError } = await client
    .from("image")
    .select("position")
    .eq(column, input.owner.id)
    .order("position", { ascending: false })
    .limit(1);
  if (lastError) return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };

  const buildPath =
    input.owner.kind === "product" ? buildProductImagePath : buildDesignImagePath;
  const path = buildPath(input.owner.id, PHOTO_CONTENT_TYPE, crypto.randomUUID());
  const upload = await client.storage
    .from("images")
    .upload(path, resized, { contentType: PHOTO_CONTENT_TYPE });
  if (upload.error) return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };

  const inserted = await client.from("image").insert({
    storage_path: path,
    alt_text: altText,
    kind: input.kind,
    position: (last?.[0]?.position ?? 0) + 1,
    [column]: input.owner.id,
  });
  if (inserted.error) {
    await client.storage.from("images").remove([path]);
    return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };
  }
  return { ok: true };
}

export async function updateImage(
  client: SupabaseClient,
  imageId: string,
  input: { altText: string; kind: ImageKind },
): Promise<Result> {
  const altText = input.altText.trim();
  const problem = validateAltText(altText);
  if (problem) return { ok: false, error: problem };
  const { data, error } = await client
    .from("image")
    .update({ alt_text: altText, kind: input.kind })
    .eq("id", imageId)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, error: GENERIC };
  return { ok: true };
}

/** Swaps a photo with its neighbour. The first photo is the cover. */
export async function moveImage(
  client: SupabaseClient,
  imageId: string,
  direction: "up" | "down",
): Promise<Result> {
  const { data: image } = await client
    .from("image")
    .select("product_id, design_id")
    .eq("id", imageId)
    .maybeSingle();
  const column = image?.product_id ? "product_id" : image?.design_id ? "design_id" : null;
  if (!image || !column) return { ok: false, error: GENERIC };

  const { data, error } = await client
    .from("image")
    .select("id, position, created_at")
    .eq(column, image[column])
    .order("position")
    .order("created_at");
  if (error || !data) return { ok: false, error: GENERIC };

  const order = data.map((i) => i.id as string);
  const from = order.indexOf(imageId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];

  // Rewrite positions 1..n, so equal positions never block a move.
  for (const [index, id] of order.entries()) {
    const current = data.find((i) => i.id === id)!;
    if (current.position === index + 1) continue;
    const { error: updateError } = await client
      .from("image")
      .update({ position: index + 1 })
      .eq("id", id);
    if (updateError) return { ok: false, error: GENERIC };
  }
  return { ok: true };
}

export async function deleteImage(
  client: SupabaseClient,
  imageId: string,
): Promise<Result> {
  const { data: image } = await client
    .from("image")
    .select("storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { ok: false, error: "No se pudo eliminar la foto. Intenta de nuevo." };
  const { data, error } = await client.from("image").delete().eq("id", imageId).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "No se pudo eliminar la foto. Intenta de nuevo." };
  }
  const removed = await client.storage.from("images").remove([image.storage_path]);
  if (removed.error) {
    return { ok: false, error: "La foto se quitó, pero no se pudo borrar su archivo." };
  }
  return { ok: true };
}
