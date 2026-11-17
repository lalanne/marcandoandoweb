import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { FloatingWhatsapp } from "@/components/site/FloatingWhatsapp";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { CartProduct } from "@/lib/cart/cart";
import { PRODUCT_KINDS } from "@/lib/catalog/kind";
import { loadCatalog } from "@/lib/catalog/load";

// The cart page (spec 006). Prerendered and served from the cache like the home page:
// the published Personas products are read once, through the cached `loadCatalog`, and
// built into the page, and the browser matches the stored items against them. A visit
// never reads the database, and what the visitor stored never reaches the server.
// Not in the sitemap and `noindex` (criterion 26).
export const metadata: Metadata = {
  title: "Tu carrito | Marcando Ando",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const { products } = await loadCatalog();
  const forCart: CartProduct[] = PRODUCT_KINDS.flatMap((kind) => products[kind]).map((p) => ({
    slug: p.slug,
    name: p.name,
    priceFromClp: p.priceFromClp,
    isAvailable: p.isAvailable,
    colors: p.colors,
    sizes: p.sizes,
    image: p.images[0] ?? null,
  }));
  return (
    <>
      <SiteHeader base="/" cartActive />
      <main className="flex-1 bg-brand-cream">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Tu carrito</h1>
          <CartView products={forCart} />
        </div>
      </main>
      <SiteFooter />
      <FloatingWhatsapp />
    </>
  );
}
