import { isProductKind, type ProductKind } from "@/lib/catalog/kind";
import { parsePriceClp } from "./price";
import { isValidSlug, slugify } from "./slug";

export const MAX_COLORS = 20;
export const MAX_SIZES = 20;
export const MAX_COLOR_NAME = 30;
export const MAX_SIZE_LABEL = 20;
export const MAX_CHARACTERISTICS = 1000;

export type ColorValue = { name: string; hex: string };

export type ProductValues = {
  name: string;
  slug: string;
  description: string | null;
  price_from_clp: number | null;
  kind: ProductKind;
  is_featured: boolean;
  is_available: boolean;
  is_published: boolean;
  colors: ColorValue[];
  sizes: string[];
  characteristics: string;
};

export type ProductField =
  | "name"
  | "slug"
  | "price"
  | "kind"
  | "colors"
  | "sizes"
  | "characteristics";

export type ProductFormResult = {
  values: ProductValues | null;
  errors: Partial<Record<ProductField, string>>;
};

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function texts(data: FormData, key: string): string[] {
  return data.getAll(key).filter((v): v is string => typeof v === "string");
}

/** The color rows as typed (name and picker value), before checking. */
export function readColorRows(data: FormData): ColorValue[] {
  const names = texts(data, "color_name");
  const hexes = texts(data, "color_hex");
  return names.map((name, i) => ({ name, hex: hexes[i] ?? "" }));
}

/** The size rows as typed, before checking. */
export function readSizeRows(data: FormData): string[] {
  return texts(data, "size");
}

// Spec 001, criteria 24 to 26; spec 002, criterion 64. Same limits as the
// database, so a refused form says why before the database has to.
function checkColors(rows: ColorValue[]): { colors: ColorValue[]; error?: string } {
  if (rows.length > MAX_COLORS) {
    return { colors: [], error: `Puedes agregar hasta ${MAX_COLORS} colores.` };
  }
  const colors: ColorValue[] = [];
  for (const [i, row] of rows.entries()) {
    const name = row.name.trim();
    const hex = row.hex.trim();
    if (!name) return { colors: [], error: `Escribe el nombre del color ${i + 1} o quítalo.` };
    if (name.length > MAX_COLOR_NAME) {
      return {
        colors: [],
        error: `El nombre del color ${i + 1} puede tener hasta ${MAX_COLOR_NAME} letras.`,
      };
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      return { colors: [], error: `Elige un color válido para «${name}».` };
    }
    colors.push({ name, hex });
  }
  return { colors };
}

function checkSizes(rows: string[]): { sizes: string[]; error?: string } {
  if (rows.length > MAX_SIZES) {
    return { sizes: [], error: `Puedes agregar hasta ${MAX_SIZES} tamaños o tallas.` };
  }
  const sizes: string[] = [];
  for (const [i, row] of rows.entries()) {
    const label = row.trim();
    if (!label) return { sizes: [], error: `Escribe el tamaño o la talla ${i + 1} o quítala.` };
    if (label.length > MAX_SIZE_LABEL) {
      return {
        sizes: [],
        error: `Cada tamaño o talla puede tener hasta ${MAX_SIZE_LABEL} letras.`,
      };
    }
    sizes.push(label);
  }
  return { sizes };
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

  const colors = checkColors(readColorRows(data));
  if (colors.error) errors.colors = colors.error;
  const sizes = checkSizes(readSizeRows(data));
  if (sizes.error) errors.sizes = sizes.error;
  const characteristics = text(data, "characteristics").trim();
  if (characteristics.length > MAX_CHARACTERISTICS) {
    errors.characteristics = "Las características pueden tener hasta 1.000 letras.";
  }

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
      colors: colors.colors,
      sizes: sizes.sizes,
      characteristics,
    },
  };
}
