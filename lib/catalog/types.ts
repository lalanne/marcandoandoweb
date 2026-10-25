export type CatalogImage = { storagePath: string; altText: string };

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  position: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Null when the owner has not confirmed a price: nothing is shown then. */
  priceFromClp: number | null;
  categoryId: string;
  isFeatured: boolean;
  isAvailable: boolean;
  coverImage: CatalogImage | null;
};

export type CatalogSection = {
  category: CatalogCategory;
  products: CatalogProduct[];
};

export type CatalogDesign = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  images: CatalogImage[];
};

export type Catalog = { sections: CatalogSection[]; designs: CatalogDesign[] };
