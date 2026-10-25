/** Public URL of a file in the `images` storage bucket (public bucket). */
export function publicImageUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/images/${storagePath}`;
}
