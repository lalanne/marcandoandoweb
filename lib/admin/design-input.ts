import { isValidSlug, slugify } from "./slug";

export type DesignValues = {
  title: string;
  slug: string;
  description: string | null;
  is_featured: boolean;
  is_published: boolean;
};

export type DesignField = "title" | "slug";

export type DesignFormResult = {
  values: DesignValues | null;
  errors: Partial<Record<DesignField, string>>;
};

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

/** Reads and checks the design form. Messages are Spanish, one per field. */
export function parseDesignForm(data: FormData): DesignFormResult {
  const errors: DesignFormResult["errors"] = {};

  const title = text(data, "title").trim();
  if (!title) errors.title = "Escribe el título del diseño.";

  const slug = text(data, "slug").trim() || slugify(title);
  // A title with no letters or digits ("!!!") gives an empty slug: ask for one.
  if ((slug || title) && !isValidSlug(slug)) {
    errors.slug =
      "La dirección web solo puede tener letras minúsculas sin tilde, números y guiones (por ejemplo estrellas-doradas).";
  }

  if (Object.keys(errors).length > 0) return { values: null, errors };

  return {
    errors,
    values: {
      title,
      slug,
      description: text(data, "description").trim() || null,
      is_featured: data.get("is_featured") === "on",
      is_published: data.get("is_published") === "on",
    },
  };
}
