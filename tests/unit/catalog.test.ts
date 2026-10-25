import { describe, expect, it } from "vitest";
import { formatClp } from "@/lib/catalog/format";
import { groupByCategory } from "@/lib/catalog/group";
import { publicImageUrl } from "@/lib/catalog/images";

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

describe("publicImageUrl", () => {
  it("[002-AC16] builds the public storage URL of an image", () => {
    expect(publicImageUrl("http://x.test/", "demo/botella.webp")).toBe(
      "http://x.test/storage/v1/object/public/images/demo/botella.webp",
    );
  });
});
