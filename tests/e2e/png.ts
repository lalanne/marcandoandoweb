import { deflateSync, crc32 } from "node:zlib";

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, check]);
}

/**
 * A solid-color RGB PNG of the given size, generated here so the tests need no
 * image files. Photos are shown from a resized copy, so a fixture a few pixels wide
 * would report a natural width of 0 in the browser; this one is a real photo size.
 */
export function solidPng(width: number, height: number, rgb = [149, 101, 196]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) Buffer.from(rgb).copy(row, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
