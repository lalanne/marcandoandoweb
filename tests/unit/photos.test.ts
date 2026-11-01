import { describe, expect, it } from "vitest";
import { nextPhoto, photosInOrder, previousPhoto, swipeStep } from "@/lib/catalog/photos";

describe("product photos", () => {
  it("[002-AC47] orders the photos by the admin's position", () => {
    const rows = [
      { storage_path: "c.png", alt_text: "C", position: 3 },
      { storage_path: "a.png", alt_text: "A", position: 1 },
      { storage_path: "b.png", alt_text: "B", position: 2 },
    ];
    expect(photosInOrder(rows)).toEqual([
      { storagePath: "a.png", altText: "A" },
      { storagePath: "b.png", altText: "B" },
      { storagePath: "c.png", altText: "C" },
    ]);
    expect(photosInOrder([])).toEqual([]);
    expect(photosInOrder(null)).toEqual([]);
  });

  it("[002-AC47] moves to the next photo and goes back to the first after the last", () => {
    expect(nextPhoto(0, 4)).toBe(1);
    expect(nextPhoto(2, 4)).toBe(3);
    expect(nextPhoto(3, 4)).toBe(0);
  });

  it("[002-AC47] moves to the previous photo and goes to the last before the first", () => {
    expect(previousPhoto(1, 4)).toBe(0);
    expect(previousPhoto(0, 4)).toBe(3);
  });

  it("[002-AC46] a single photo stays where it is", () => {
    expect(nextPhoto(0, 1)).toBe(0);
    expect(previousPhoto(0, 1)).toBe(0);
  });

  it("[002-AC48] a sideways swipe moves one photo; a short or mostly vertical one does nothing", () => {
    expect(swipeStep(-80, 5)).toBe(1); // finger to the left: next photo
    expect(swipeStep(80, -5)).toBe(-1); // finger to the right: previous photo
    expect(swipeStep(-20, 0)).toBe(0); // too short
    expect(swipeStep(-60, 90)).toBe(0); // mostly vertical: the page scrolls
  });
});
