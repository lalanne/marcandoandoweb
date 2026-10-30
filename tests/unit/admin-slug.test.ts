import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "@/lib/admin/slug";

describe("slugify", () => {
  it("lowercases, joins words with dashes and drops accents", () => {
    expect(slugify("Polera Día del Padre")).toBe("polera-dia-del-padre");
    expect(slugify("Calcetines niño")).toBe("calcetines-nino");
  });

  it("drops symbols and collapses repeated separators", () => {
    expect(slugify("  Botella  --  50% off!! ")).toBe("botella-50-off");
  });

  it("gives an empty string when nothing usable is left", () => {
    expect(slugify("¡¿?!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase kebab-case", () => {
    expect(isValidSlug("polera-roja-2")).toBe(true);
    expect(isValidSlug("botella")).toBe(true);
  });

  it("refuses uppercase, spaces, accents and stray dashes", () => {
    for (const bad of ["", "Polera", "polera roja", "niño", "-a", "a-", "a--b", "a_b"]) {
      expect(isValidSlug(bad)).toBe(false);
    }
  });
});
