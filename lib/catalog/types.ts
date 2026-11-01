import type { ProductKind } from "./kind";

export type CatalogImage = { storagePath: string; altText: string };

export type CatalogColor = { name: string; hex: string };

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Null when the owner has not confirmed a price: nothing is shown then. */
  priceFromClp: number | null;
  kind: ProductKind;
  isFeatured: boolean;
  isAvailable: boolean;
  /** Every photo in the admin's order; the first is the cover. */
  images: CatalogImage[];
  /** In display order; empty when the owner gave none (spec 001, criterion 24). */
  colors: CatalogColor[];
  /** Sizes and clothing sizes alike, in display order. */
  sizes: string[];
  /** One characteristic per line; empty when none. */
  characteristics: string;
};

export type CatalogDesign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  images: CatalogImage[];
};

export type Catalog = {
  /** Published products by type, highlighted first (spec 002, criterion 33). */
  products: Record<ProductKind, CatalogProduct[]>;
  designs: CatalogDesign[];
};
