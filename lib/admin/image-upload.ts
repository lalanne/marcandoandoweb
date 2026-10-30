// Rules for the photos of the catalog. The bucket enforces the same limits
// (supabase/migrations: 5 MiB; jpeg, png, webp, avif); these give clear Spanish
// messages before and after the upload.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

export const IMAGE_TYPE_ERROR =
  "Esa foto no se puede usar. Usa un archivo JPG, PNG, WebP o AVIF.";
export const IMAGE_SIZE_ERROR = "La foto pesa más de 5 MB. Elige una más liviana.";
export const IMAGE_MISSING_ERROR = "Elige una foto para subir.";
export const ALT_TEXT_ERROR =
  "Escribe el texto alternativo de la foto: describe lo que se ve, para quien no puede verla.";

/** A Spanish message when the file cannot be used, or null when it can. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (file.size === 0) return IMAGE_MISSING_ERROR;
  if (!(file.type in EXTENSIONS)) return IMAGE_TYPE_ERROR;
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_SIZE_ERROR;
  return null;
}

export function validateAltText(altText: string): string | null {
  return altText.trim() === "" ? ALT_TEXT_ERROR : null;
}

function buildImagePath(
  folder: "product" | "design",
  ownerId: string,
  mimeType: string,
  uuid: string,
): string {
  const ext = EXTENSIONS[mimeType];
  if (!ext) throw new Error(`Unsupported image type: ${mimeType}`);
  return `${folder}/${ownerId}/${uuid}.${ext}`;
}

/** Storage path of a product photo: `product/<product_id>/<uuid>.<ext>`. */
export function buildProductImagePath(
  productId: string,
  mimeType: string,
  uuid: string,
): string {
  return buildImagePath("product", productId, mimeType, uuid);
}

/** Storage path of a design photo: `design/<design_id>/<uuid>.<ext>`. */
export function buildDesignImagePath(
  designId: string,
  mimeType: string,
  uuid: string,
): string {
  return buildImagePath("design", designId, mimeType, uuid);
}
