import { describe, expect, it } from "vitest";
import { parseDesignForm } from "@/lib/admin/design-input";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseDesignForm", () => {
  it("returns clean values, with an empty description as null and checkboxes as booleans", () => {
    const ok = parseDesignForm(
      form({
        title: "  Estrellas de prueba ",
        slug: "estrellas-de-prueba",
        description: " ",
        is_published: "on",
      }),
    );
    expect(ok.errors).toEqual({});
    expect(ok.values).toEqual({
      title: "Estrellas de prueba",
      slug: "estrellas-de-prueba",
      description: null,
      is_featured: false,
      is_published: true,
    });
  });

  it("generates the slug from the title when it is empty", () => {
    const ok = parseDesignForm(form({ title: "Taza Mágica Ñandú", slug: "" }));
    expect(ok.values?.slug).toBe("taza-magica-nandu");
  });

  it("refuses an empty title with a Spanish message", () => {
    const r = parseDesignForm(form({ title: "  ", slug: "algo" }));
    expect(r.values).toBeNull();
    expect(r.errors.title).toMatch(/título/i);
  });

  it("asks for a slug when the title has no letters or digits to make one from", () => {
    const r = parseDesignForm(form({ title: "!!!", slug: "" }));
    expect(r.values).toBeNull();
    expect(r.errors.slug).toBeDefined();
  });

  it("refuses a slug that is not lowercase kebab-case", () => {
    const r = parseDesignForm(form({ title: "Algo", slug: "Dirección Mala!" }));
    expect(r.values).toBeNull();
    expect(r.errors.slug).toMatch(/minúsculas/);
  });
});
