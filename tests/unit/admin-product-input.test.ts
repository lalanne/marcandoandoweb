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
      colors: [],
      sizes: [],
      characteristics: "",
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

// Colors, sizes and characteristics (spec 002 criterion 64; spec 001 criteria 24 to 26).
function detailsForm(parts: {
  colors?: [string, string][];
  sizes?: string[];
  characteristics?: string;
}): FormData {
  const data = form(base);
  for (const [name, hex] of parts.colors ?? []) {
    data.append("color_name", name);
    data.append("color_hex", hex);
  }
  for (const size of parts.sizes ?? []) data.append("size", size);
  if (parts.characteristics !== undefined) data.set("characteristics", parts.characteristics);
  return data;
}

describe("parseProductForm: colors, sizes and characteristics", () => {
  it("[002-AC64] reads colors, sizes and characteristics in the order entered", () => {
    const r = parseProductForm(
      detailsForm({
        colors: [
          ["Rosado", "#E8647F"],
          [" Celeste ", "#4fb0b0"],
        ],
        sizes: ["4", " 6 "],
        characteristics: "100% algodón\nEstampado con vinilo",
      }),
    );
    expect(r.errors).toEqual({});
    expect(r.values?.colors).toEqual([
      { name: "Rosado", hex: "#E8647F" },
      { name: "Celeste", hex: "#4fb0b0" },
    ]);
    expect(r.values?.sizes).toEqual(["4", "6"]);
    expect(r.values?.characteristics).toBe("100% algodón\nEstampado con vinilo");
  });

  it("[002-AC64] [001-AC24] [001-AC25] [001-AC26] are all optional and default to empty", () => {
    const r = parseProductForm(form(base));
    expect(r.errors).toEqual({});
    expect(r.values?.colors).toEqual([]);
    expect(r.values?.sizes).toEqual([]);
    expect(r.values?.characteristics).toBe("");
  });

  it("[001-AC24] [002-AC64] refuses a color with no name, a bad hex or a 21st row", () => {
    const noName = parseProductForm(detailsForm({ colors: [["  ", "#E8647F"]] }));
    expect(noName.values).toBeNull();
    expect(noName.errors.colors).toMatch(/nombre/i);

    for (const hex of ["E8647F", "#E86", "#GGGGGG", ""]) {
      const r = parseProductForm(detailsForm({ colors: [["Rosado", hex]] }));
      expect(r.values, hex).toBeNull();
      expect(r.errors.colors, hex).toMatch(/color/i);
    }

    const longName = parseProductForm(detailsForm({ colors: [["x".repeat(31), "#E8647F"]] }));
    expect(longName.errors.colors).toMatch(/30/);

    const rows: [string, string][] = Array.from({ length: 21 }, (_, i) => [`C${i}`, "#E8647F"]);
    const many = parseProductForm(detailsForm({ colors: rows }));
    expect(many.values).toBeNull();
    expect(many.errors.colors).toMatch(/20/);
    expect(parseProductForm(detailsForm({ colors: rows.slice(0, 20) })).errors).toEqual({});
  });

  it("[001-AC25] [002-AC64] refuses an empty size, a long label or a 21st row", () => {
    const empty = parseProductForm(detailsForm({ sizes: ["4", "  "] }));
    expect(empty.values).toBeNull();
    expect(empty.errors.sizes).toMatch(/talla|tamaño/i);

    const long = parseProductForm(detailsForm({ sizes: ["x".repeat(21)] }));
    expect(long.errors.sizes).toMatch(/20/);

    const many = parseProductForm(
      detailsForm({ sizes: Array.from({ length: 21 }, (_, i) => `T${i}`) }),
    );
    expect(many.values).toBeNull();
    expect(many.errors.sizes).toMatch(/20/);
  });

  it("[001-AC26] refuses characteristics over 1000 characters", () => {
    const r = parseProductForm(detailsForm({ characteristics: "x".repeat(1001) }));
    expect(r.values).toBeNull();
    expect(r.errors.characteristics).toMatch(/1\.?000/);
    expect(
      parseProductForm(detailsForm({ characteristics: "x".repeat(1000) })).errors,
    ).toEqual({});
  });
});
