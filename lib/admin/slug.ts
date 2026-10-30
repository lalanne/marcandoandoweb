const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Same rule as the database: lowercase letters and digits joined by single dashes. */
export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug);
}

/** A slug from a name: no accents, lowercase, anything else becomes one dash. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
