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

/** A Spanish message when the file cannot be used, or null when it can. */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (file.size === 0) return IMAGE_MISSING_ERROR;
  if (!(file.type in EXTENSIONS)) return IMAGE_TYPE_ERROR;
  if (file.size > MAX_IMAGE_BYTES) return IMAGE_SIZE_ERROR;
  return null;
}

/**
 * The alt text is optional (spec 002, criteria 90 to 92). An empty one becomes
 * "Foto de {name}", so the table's not-empty constraint holds and no public
 * image is left without Spanish alt text.
 */
export function altTextOrDefault(altText: string, ownerName: string): string {
  const written = altText.trim();
  if (written !== "") return written;
  const name = ownerName.trim();
  return name === "" ? "Foto" : `Foto de ${name}`;
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
