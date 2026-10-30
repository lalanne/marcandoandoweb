"use server";

import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";
import {
  validateAltText,
  validateImageFile,
} from "@/lib/admin/image-upload";
import { parseProductForm, type ProductField } from "@/lib/admin/product-input";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  moveProductImage,
  updateProduct,
  updateProductImage,
  type ImageKind,
} from "@/lib/admin/products";
import { createClient } from "@/lib/supabase/server";

// Server Actions behind /panel/productos. Each one checks the admin again and
// then acts with the admin's own session, so row-level security and the storage
// policies decide too. The service-role key is never used here.

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!isAdminUser(user)) redirect("/entrar?error=sin-acceso");
  return supabase;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function kindOf(data: FormData): ImageKind {
  return text(data, "kind") === "graphic" ? "graphic" : "photo";
}

const editPath = (id: string) => `/panel/productos/${encodeURIComponent(id)}`;

export type RawProduct = {
  name: string;
  slug: string;
  description: string;
  price: string;
  category_id: string;
  is_featured: boolean;
  is_available: boolean;
  is_published: boolean;
};

export type ProductFormState = {
  errors: Partial<Record<ProductField | "form", string>>;
  /** What was typed, so a refused form keeps it. */
  values: RawProduct | null;
};

export async function saveProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await adminClient();
  const id = text(formData, "id");

  const raw: RawProduct = {
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    price: text(formData, "price"),
    category_id: text(formData, "category_id"),
    is_featured: formData.get("is_featured") === "on",
    is_available: formData.get("is_available") === "on",
    is_published: formData.get("is_published") === "on",
  };

  const parsed = parseProductForm(formData);
  if (!parsed.values) return { errors: parsed.errors, values: raw };

  if (id) {
    const result = await updateProduct(supabase, id, parsed.values);
    if (!result.ok) {
      return {
        errors: { [result.field ?? "form"]: result.error },
        values: raw,
      };
    }
    redirect(`${editPath(id)}?aviso=guardado`);
  }

  const result = await createProduct(supabase, parsed.values);
  if (!result.ok) {
    return { errors: { [result.field ?? "form"]: result.error }, values: raw };
  }
  redirect(`${editPath(result.id)}?aviso=creado`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const id = text(formData, "id");
  const result = await deleteProduct(supabase, id);
  if (!result.ok) redirect(`${editPath(id)}?aviso=no-eliminado`);
  redirect("/panel/productos?aviso=eliminado");
}

export type PhotoFormState = { error: string | null };

export async function uploadPhoto(
  _previous: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const supabase = await adminClient();
  const productId = text(formData, "product_id");
  const altText = text(formData, "alt_text");
  const file = formData.get("file");

  const altProblem = validateAltText(altText);
  if (altProblem) return { error: altProblem };
  if (!(file instanceof File)) return { error: "Elige una foto para subir." };
  const fileProblem = validateImageFile(file);
  if (fileProblem) return { error: fileProblem };

  const result = await addProductImage(supabase, {
    productId,
    file: { type: file.type, size: file.size, body: file },
    altText,
    kind: kindOf(formData),
  });
  if (!result.ok) return { error: result.error };
  redirect(`${editPath(productId)}?aviso=foto-subida`);
}

export async function savePhoto(
  _previous: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const supabase = await adminClient();
  const result = await updateProductImage(supabase, text(formData, "image_id"), {
    altText: text(formData, "alt_text"),
    kind: kindOf(formData),
  });
  if (!result.ok) return { error: result.error };
  redirect(`${editPath(text(formData, "product_id"))}?aviso=foto-guardada`);
}

export async function movePhoto(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  await moveProductImage(supabase, text(formData, "image_id"), direction);
  redirect(editPath(text(formData, "product_id")));
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const result = await deleteProductImage(supabase, text(formData, "image_id"));
  redirect(
    `${editPath(text(formData, "product_id"))}?aviso=${
      result.ok ? "foto-eliminada" : "foto-no-eliminada"
    }`,
  );
}
