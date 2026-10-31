import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GENERIC,
  IMAGE_COLUMNS,
  addImage,
  deleteImage,
  moveImage,
  toAdminImages,
  updateImage,
  type AdminImage,
  type ImageKind,
  type Result,
} from "./images";
import type { ProductKind } from "@/lib/catalog/kind";
import type { ProductValues } from "./product-input";

export type { ProductValues } from "./product-input";
export type { AdminImage, ImageKind, Result } from "./images";

// Everything the admin does to products. Every function takes the client of the
// signed-in admin: row-level security and the storage policies decide, so a
// client that is not the admin is refused by the database. The service-role key
// is never used. The photos are handled in `./images`, shared with designs.

export type AdminProduct = ProductValues & { id: string; images: AdminImage[] };

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price_from_clp: number | null;
  is_featured: boolean;
  is_available: boolean;
  is_published: boolean;
  kind: ProductKind;
};

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: "slug" };

const DUPLICATE_SLUG =
  "Ya hay un producto con esa dirección web. Cambia la dirección para que sea distinta.";

function failure(error: { code?: string; message: string }): {
  ok: false;
  error: string;
  field?: "slug";
} {
  if (error.code === "23505") return { ok: false, error: DUPLICATE_SLUG, field: "slug" };
  return { ok: false, error: GENERIC };
}

export async function listProducts(client: SupabaseClient): Promise<ProductListItem[]> {
  const { data, error } = await client
    .from("product")
    .select(
      "id, name, slug, price_from_clp, is_featured, is_available, is_published, kind",
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
      `id, name, slug, description, price_from_clp, kind, is_featured, is_available, is_published,${IMAGE_COLUMNS}`,
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
  return { ...product, images: toAdminImages(image) } as AdminProduct;
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

// The product photos are the shared photo functions with a product as owner.

export function addProductImage(
  client: SupabaseClient,
  input: {
    productId: string;
    file: { type: string; size: number; body: Blob | Uint8Array };
    altText: string;
    kind: ImageKind;
  },
): Promise<Result> {
  const { productId, ...rest } = input;
  return addImage(client, { ...rest, owner: { kind: "product", id: productId } });
}

export const updateProductImage = updateImage;
export const moveProductImage = moveImage;
export const deleteProductImage = deleteImage;

