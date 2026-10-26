import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  buildProductImagePath,
  validateAltText,
  validateImageFile,
} from "@/lib/admin/image-upload";

const ID = "0b9f6f0e-8c53-4f4e-a1d6-3f5b2b1d9a10";
const UUID = "5d1d3f0a-3a52-4d6f-9d0e-4a0f2f0c7a77";

describe("buildProductImagePath", () => {
  it("builds product/<product_id>/<uuid>.<ext> from the file type", () => {
    expect(buildProductImagePath(ID, "image/png", UUID)).toBe(`product/${ID}/${UUID}.png`);
    expect(buildProductImagePath(ID, "image/jpeg", UUID)).toBe(`product/${ID}/${UUID}.jpg`);
    expect(buildProductImagePath(ID, "image/webp", UUID)).toBe(`product/${ID}/${UUID}.webp`);
    expect(buildProductImagePath(ID, "image/avif", UUID)).toBe(`product/${ID}/${UUID}.avif`);
  });

  it("refuses a type the bucket does not allow", () => {
    expect(() => buildProductImagePath(ID, "image/gif", UUID)).toThrow();
  });
});

describe("validateImageFile", () => {
  it("accepts jpeg, png, webp and avif up to 5 MiB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
      expect(validateImageFile({ type, size: 1000 })).toBeNull();
    }
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("refuses a file above 5 MiB with a Spanish message", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(
      /5 MB/,
    );
  });

  it("refuses other types and empty files with a Spanish message", () => {
    expect(validateImageFile({ type: "image/gif", size: 10 })).toMatch(/JPG, PNG, WebP o AVIF/);
    expect(validateImageFile({ type: "application/pdf", size: 10 })).not.toBeNull();
    expect(validateImageFile({ type: "image/png", size: 0 })).toMatch(/elige/i);
  });
});

describe("validateAltText", () => {
  it("requires text", () => {
    expect(validateAltText("Botella azul con estrellas")).toBeNull();
    expect(validateAltText("")).toMatch(/texto alternativo/i);
    expect(validateAltText("   ")).toMatch(/texto alternativo/i);
  });
});
