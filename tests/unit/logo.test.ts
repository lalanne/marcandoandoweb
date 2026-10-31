import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Issue #77: the header logo sits on the page background, so its file must
// carry transparency. A WebP with alpha is an extended file (RIFF … WEBP VP8X)
// whose flags byte has the alpha bit (0x10) set.

const file = readFileSync("public/img/logo.webp");

function chunkIds(buffer: Buffer): string[] {
  const ids: string[] = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    ids.push(id);
    offset += 8 + size + (size % 2);
  }
  return ids;
}

describe("header logo file", () => {
  it("is a WebP", () => {
    expect(file.toString("ascii", 0, 4)).toBe("RIFF");
    expect(file.toString("ascii", 8, 12)).toBe("WEBP");
  });

  it("has an alpha channel, so the page background shows through", () => {
    const ids = chunkIds(file);
    expect(ids[0]).toBe("VP8X");
    expect(file[20] & 0x10).toBe(0x10);
    // Lossy WebP keeps alpha in its own chunk; lossless keeps it in VP8L.
    expect(ids.some((id) => id === "ALPH" || id === "VP8L")).toBe(true);
  });

  it("stays light enough to load fast", () => {
    expect(file.length).toBeLessThan(100 * 1024);
  });
});
