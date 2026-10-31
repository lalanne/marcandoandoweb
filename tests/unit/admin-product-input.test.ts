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
  kind: "producto",
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
      kind: "producto",
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
      form({ name: " ", slug: "Mala Slug", price: "7,5", kind: "" }),
    );
    expect(r.values).toBeNull();
    expect(r.errors.name).toMatch(/nombre/i);
    expect(r.errors.slug).toMatch(/minúsculas/i);
    expect(r.errors.price).toMatch(/precio/i);
    expect(r.errors.kind).toMatch(/tipo/i);
  });

  it("[002-AC32] reads the type: producto or pack", () => {
    expect(parseProductForm(form({ ...base, kind: "pack" })).values?.kind).toBe("pack");
    expect(parseProductForm(form({ ...base, kind: "producto" })).values?.kind).toBe(
      "producto",
    );
  });

  it("[002-AC32] requires the type and accepts only the two values", () => {
    for (const kind of ["", "Pack", "botellas", "bundle"]) {
      const r = parseProductForm(form({ ...base, kind }));
      expect(r.values, `kind "${kind}"`).toBeNull();
      expect(r.errors.kind).toBe("Elige el tipo: producto o pack.");
    }
    const { kind: _omit, ...noKind } = base;
    void _omit;
    expect(parseProductForm(form(noKind)).errors.kind).toMatch(/tipo/i);
  });

  it("[002-AC32] no longer reads a category", () => {
    const r = parseProductForm(form({ ...base, category_id: "c-1" }));
    expect(r.values).not.toHaveProperty("category_id");
  });
});
