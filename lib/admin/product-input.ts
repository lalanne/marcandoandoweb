import { isProductKind, type ProductKind } from "@/lib/catalog/kind";
import { parsePriceClp } from "./price";
import { isValidSlug, slugify } from "./slug";

export type ProductValues = {
  name: string;
  slug: string;
  description: string | null;
  price_from_clp: number | null;
  kind: ProductKind;
  is_featured: boolean;
  is_available: boolean;
  is_published: boolean;
};

export type ProductField = "name" | "slug" | "price" | "kind";

export type ProductFormResult = {
  values: ProductValues | null;
  errors: Partial<Record<ProductField, string>>;
};

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

/** Reads and checks the product form. Messages are Spanish, one per field. */
export function parseProductForm(data: FormData): ProductFormResult {
  const errors: ProductFormResult["errors"] = {};

  const name = text(data, "name").trim();
  if (!name) errors.name = "Escribe el nombre del producto.";

  const slug = text(data, "slug").trim() || slugify(name);
  if (slug && !isValidSlug(slug)) {
    errors.slug =
      "La dirección web solo puede tener letras minúsculas sin tilde, números y guiones (por ejemplo polera-roja).";
  }

  const price = parsePriceClp(text(data, "price"));
  if (!price.ok) errors.price = price.error;

  // Producto or Pack only (spec 002, criterion 32). The form starts on Producto.
  const kind = text(data, "kind");
  if (!isProductKind(kind)) errors.kind = "Elige el tipo: producto o pack.";

  if (Object.keys(errors).length > 0 || !price.ok || !isProductKind(kind)) {
    return { values: null, errors };
  }

  return {
    errors,
    values: {
      name,
      slug,
      description: text(data, "description").trim() || null,
      price_from_clp: price.value,
      kind,
      is_featured: data.get("is_featured") === "on",
      is_available: data.get("is_available") === "on",
      is_published: data.get("is_published") === "on",
    },
  };
}
