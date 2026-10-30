import { describe, expect, it } from "vitest";
import { parseProductForm } from "@/lib/admin/product-input";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const base = {
  name: "  Polera de prueba ",
  slug: "polera-de-prueba",
  description: "",
  price: "7.000",
  category_id: "11111111-1111-4111-8111-111111111111",
};

describe("parseProductForm", () => {
  it("returns clean values, with empty price as null and checkboxes as booleans", () => {
    const ok = parseProductForm(form({ ...base, price: "", is_published: "on" }));
    expect(ok.errors).toEqual({});
    expect(ok.values).toEqual({
      name: "Polera de prueba",
      slug: "polera-de-prueba",
      description: null,
      price_from_clp: null,
      category_id: base.category_id,
      is_featured: false,
      is_available: false,
      is_published: true,
    });
  });

  it("parses the price with the dot", () => {
    expect(parseProductForm(form(base)).values?.price_from_clp).toBe(7000);
  });

  it("generates the slug from the name when it is left empty", () => {
    const r = parseProductForm(form({ ...base, name: "Taza Mágica", slug: "" }));
    expect(r.values?.slug).toBe("taza-magica");
  });

  it("reports Spanish errors per field", () => {
    const r = parseProductForm(
      form({ name: " ", slug: "Mala Slug", price: "7,5", category_id: "" }),
    );
    expect(r.values).toBeNull();
    expect(r.errors.name).toMatch(/nombre/i);
    expect(r.errors.slug).toMatch(/minúsculas/i);
    expect(r.errors.price).toMatch(/precio/i);
    expect(r.errors.category_id).toMatch(/categoría/i);
  });
});
