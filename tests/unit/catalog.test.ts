import { describe, expect, it } from "vitest";
import { formatClp } from "@/lib/catalog/format";
import { groupByCategory } from "@/lib/catalog/group";
import { imagePathFromSegments, imageUrl } from "@/lib/catalog/images";

const cat = (slug: string, position: number) => ({
  id: `c-${slug}`,
  slug,
  name: slug,
  position,
});
const prod = (
  slug: string,
  categoryId: string,
  extra: Record<string, unknown> = {},
) => ({
  id: `p-${slug}`,
  slug,
  name: slug,
  description: null,
  priceFromClp: null,
  categoryId,
  isFeatured: false,
  isAvailable: true,
  coverImage: null,
  ...extra,
});

describe("formatClp", () => {
  it("[002-AC12] writes pesos with a dot as thousands separator", () => {
    expect(formatClp(7000)).toBe("$7.000");
    expect(formatClp(14000)).toBe("$14.000");
    expect(formatClp(5500)).toBe("$5.500");
    expect(formatClp(900)).toBe("$900");
    expect(formatClp(1234567)).toBe("$1.234.567");
  });
});

describe("groupByCategory", () => {
  it("[002-AC12] hides categories with no products", () => {
    const sections = groupByCategory(
      [cat("a", 1), cat("b", 2)],
      [prod("x", "c-b")],
    );
    expect(sections.map((s) => s.category.slug)).toEqual(["b"]);
  });

  it("[002-AC12] keeps the category order and puts highlighted products first", () => {
    const sections = groupByCategory(
      [cat("b", 2), cat("a", 1)],
      [
        prod("plain", "c-a"),
        prod("star", "c-a", { isFeatured: true }),
        prod("other", "c-b"),
      ],
    );
    expect(sections.map((s) => s.category.slug)).toEqual(["a", "b"]);
    expect(sections[0].products.map((p) => p.slug)).toEqual(["star", "plain"]);
  });
});

describe("imageUrl", () => {
  it("[002-AC26] builds the same-origin URL of an image, never a storage URL", () => {
    expect(imageUrl("demo/botella.webp")).toBe("/img/demo/botella.webp");
  });

  it("[002-AC26] encodes each path segment", () => {
    expect(imageUrl("demo/mi foto.webp")).toBe("/img/demo/mi%20foto.webp");
  });
});

describe("imagePathFromSegments", () => {
  it("[002-AC26] joins the route segments into a storage path", () => {
    expect(imagePathFromSegments(["demo", "botella.webp"])).toBe(
      "demo/botella.webp",
    );
  });

  it("[002-AC25] refuses empty paths and path traversal", () => {
    expect(imagePathFromSegments([])).toBeNull();
    expect(imagePathFromSegments(["demo", ".."])).toBeNull();
    expect(imagePathFromSegments(["."])).toBeNull();
    expect(imagePathFromSegments(["a", ""])).toBeNull();
    expect(imagePathFromSegments(["a\\b"])).toBeNull();
  });
});
