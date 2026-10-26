import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildProductImagePath,
  validateAltText,
  validateImageFile,
} from "./image-upload";
import type { ProductValues } from "./product-input";

export type { ProductValues } from "./product-input";

// Everything the admin does to products and their photos. Every function takes
// the client of the signed-in admin: row-level security and the storage
// policies decide, so a client that is not the admin is refused by the
// database. The service-role key is never used.

export type ImageKind = "photo" | "graphic";

export type AdminImage = {
  id: string;
  storage_path: string;
  alt_text: string;
  kind: ImageKind;
  position: number;
};

export type AdminProduct = ProductValues & { id: string; images: AdminImage[] };

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price_from_clp: number | null;
  is_featured: boolean;
  is_available: boolean;
  is_published: boolean;
  category: { name: string } | null;
};

export type Category = { id: string; name: string };

export type Result =
  | { ok: true }
  | { ok: false; error: string; field?: "slug" };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: "slug" };

const DUPLICATE_SLUG =
  "Ya hay un producto con esa dirección web. Cambia la dirección para que sea distinta.";
const GENERIC = "No se pudo guardar. Intenta de nuevo.";

function failure(error: { code?: string; message: string }): {
  ok: false;
  error: string;
  field?: "slug";
} {
  if (error.code === "23505") return { ok: false, error: DUPLICATE_SLUG, field: "slug" };
  return { ok: false, error: GENERIC };
}

export async function listCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client
    .from("category")
    .select("id, name")
    .order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listProducts(client: SupabaseClient): Promise<ProductListItem[]> {
  const { data, error } = await client
    .from("product")
    .select(
      "id, name, slug, price_from_clp, is_featured, is_available, is_published, category(name)",
    )
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductListItem[];
}

export async function getProduct(
  client: SupabaseClient,
  id: string,
): Promise<AdminProduct | null> {
  const { data, error } = await client
    .from("product")
    .select(
      "id, name, slug, description, price_from_clp, category_id, is_featured, is_available, is_published, image(id, storage_path, alt_text, kind, position, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // A malformed id is "not found" for the page, not a crash.
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const { image, ...product } = data as typeof data & {
    image: (AdminImage & { created_at: string })[];
  };
  const images = [...(image ?? [])].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
  return {
    ...product,
    images: images.map((i) => ({
      id: i.id,
      storage_path: i.storage_path,
      alt_text: i.alt_text,
      kind: i.kind,
      position: i.position,
    })),
  } as AdminProduct;
}

export async function createProduct(
  client: SupabaseClient,
  values: ProductValues,
): Promise<CreateResult> {
  const { data, error } = await client
    .from("product")
    .insert(values)
    .select("id")
    .single();
  if (error || !data) return failure(error ?? { message: GENERIC });
  return { ok: true, id: data.id };
}

export async function updateProduct(
  client: SupabaseClient,
  id: string,
  values: ProductValues,
): Promise<Result> {
  const { data, error } = await client
    .from("product")
    .update(values)
    .eq("id", id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: GENERIC };
  return { ok: true };
}

/** Deletes the product (its image rows go with it) and then every file it had. */
export async function deleteProduct(
  client: SupabaseClient,
  id: string,
): Promise<Result> {
  const { data: images } = await client
    .from("image")
    .select("storage_path")
    .eq("product_id", id);
  const { data, error } = await client.from("product").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, error: "No se pudo eliminar el producto. Intenta de nuevo." };
  }
  const paths = (images ?? []).map((i) => i.storage_path as string);
  if (paths.length > 0) {
    const removed = await client.storage.from("images").remove(paths);
    if (removed.error) {
      return {
        ok: false,
        error: "El producto se eliminó, pero no se pudieron borrar algunas fotos.",
      };
    }
  }
  return { ok: true };
}

export async function addProductImage(
  client: SupabaseClient,
  input: {
    productId: string;
    file: { type: string; size: number; body: Blob | Uint8Array };
    altText: string;
    kind: ImageKind;
  },
): Promise<Result> {
  const altText = input.altText.trim();
  const problem = validateAltText(altText) ?? validateImageFile(input.file);
  if (problem) return { ok: false, error: problem };

  const { data: last, error: lastError } = await client
    .from("image")
    .select("position")
    .eq("product_id", input.productId)
    .order("position", { ascending: false })
    .limit(1);
  if (lastError) return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };

  const path = buildProductImagePath(input.productId, input.file.type, crypto.randomUUID());
  const upload = await client.storage
    .from("images")
    .upload(path, input.file.body, { contentType: input.file.type });
  if (upload.error) return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };

  const inserted = await client.from("image").insert({
    storage_path: path,
    alt_text: altText,
    kind: input.kind,
    position: (last?.[0]?.position ?? 0) + 1,
    product_id: input.productId,
  });
  if (inserted.error) {
    await client.storage.from("images").remove([path]);
    return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };
  }
  return { ok: true };
}

export async function updateProductImage(
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
export async function moveProductImage(
  client: SupabaseClient,
  imageId: string,
  direction: "up" | "down",
): Promise<Result> {
  const { data: image } = await client
    .from("image")
    .select("product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!image?.product_id) return { ok: false, error: GENERIC };

  const { data, error } = await client
    .from("image")
    .select("id, position, created_at")
    .eq("product_id", image.product_id)
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

export async function deleteProductImage(
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
