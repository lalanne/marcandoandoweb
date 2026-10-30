"use server";

import { redirect } from "next/navigation";
import {
  adminClient,
  formText as text,
  imageKindOf as kindOf,
  type PhotoFormState,
} from "@/lib/admin/action-helpers";
import { parseDesignForm, type DesignField } from "@/lib/admin/design-input";
import { createDesign, deleteDesign, updateDesign } from "@/lib/admin/designs";
import {
  validateAltText,
  validateImageFile,
} from "@/lib/admin/image-upload";
import { addImage, deleteImage, moveImage, updateImage } from "@/lib/admin/images";

// Server Actions behind /panel/disenos. Each one checks the admin again and
// then acts with the admin's own session, so row-level security and the storage
// policies decide too. The service-role key is never used here.

const editPath = (id: string) => `/panel/disenos/${encodeURIComponent(id)}`;

export type RawDesign = {
  title: string;
  slug: string;
  description: string;
  is_featured: boolean;
  is_published: boolean;
};

export type DesignFormState = {
  errors: Partial<Record<DesignField | "form", string>>;
  /** What was typed, so a refused form keeps it. */
  values: RawDesign | null;
};

export async function saveDesign(
  _previous: DesignFormState,
  formData: FormData,
): Promise<DesignFormState> {
  const supabase = await adminClient();
  const id = text(formData, "id");

  const raw: RawDesign = {
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    description: text(formData, "description"),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
  };

  const parsed = parseDesignForm(formData);
  if (!parsed.values) return { errors: parsed.errors, values: raw };

  if (id) {
    const result = await updateDesign(supabase, id, parsed.values);
    if (!result.ok) {
      return { errors: { [result.field ?? "form"]: result.error }, values: raw };
    }
    redirect(`${editPath(id)}?aviso=diseno-guardado`);
  }

  const result = await createDesign(supabase, parsed.values);
  if (!result.ok) {
    return { errors: { [result.field ?? "form"]: result.error }, values: raw };
  }
  redirect(`${editPath(result.id)}?aviso=diseno-creado`);
}

export async function deleteDesignAction(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const id = text(formData, "id");
  const result = await deleteDesign(supabase, id);
  if (!result.ok) redirect(`${editPath(id)}?aviso=diseno-no-eliminado`);
  redirect("/panel/disenos?aviso=diseno-eliminado");
}

export async function uploadPhoto(
  _previous: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const supabase = await adminClient();
  const designId = text(formData, "owner_id");
  const altText = text(formData, "alt_text");
  const file = formData.get("file");

  const altProblem = validateAltText(altText);
  if (altProblem) return { error: altProblem };
  if (!(file instanceof File)) return { error: "Elige una foto para subir." };
  const fileProblem = validateImageFile(file);
  if (fileProblem) return { error: fileProblem };

  const result = await addImage(supabase, {
    owner: { kind: "design", id: designId },
    file: { type: file.type, size: file.size, body: file },
    altText,
    kind: kindOf(formData),
  });
  if (!result.ok) return { error: result.error };
  redirect(`${editPath(designId)}?aviso=foto-subida`);
}

export async function savePhoto(
  _previous: PhotoFormState,
  formData: FormData,
): Promise<PhotoFormState> {
  const supabase = await adminClient();
  const result = await updateImage(supabase, text(formData, "image_id"), {
    altText: text(formData, "alt_text"),
    kind: kindOf(formData),
  });
  if (!result.ok) return { error: result.error };
  redirect(`${editPath(text(formData, "owner_id"))}?aviso=foto-guardada`);
}

export async function movePhoto(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  await moveImage(supabase, text(formData, "image_id"), direction);
  redirect(editPath(text(formData, "owner_id")));
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const supabase = await adminClient();
  const result = await deleteImage(supabase, text(formData, "image_id"));
  redirect(
    `${editPath(text(formData, "owner_id"))}?aviso=${
      result.ok ? "foto-eliminada" : "foto-no-eliminada"
    }`,
  );
}
