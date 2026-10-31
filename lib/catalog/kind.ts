// The two product types (spec 001 and 002, amendment of 2026-10-31). Fixed in
// code and in the database check constraint: adding a third is a spec change.
export const PRODUCT_KINDS = ["producto", "pack"] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];

/** Spanish label of each type, for the admin. */
export const KIND_LABEL: Record<ProductKind, string> = {
  producto: "Producto",
  pack: "Pack",
};

export function isProductKind(value: unknown): value is ProductKind {
  return (PRODUCT_KINDS as readonly unknown[]).includes(value);
}
