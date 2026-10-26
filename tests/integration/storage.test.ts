import { describe, expect, it } from "vitest";
import {
  ADMIN,
  NON_ADMIN,
  anonClient,
  signedInClient,
  uniqueSlug,
} from "./helpers";

// Spec 002 (Data and constraints): a storage bucket for images. Only the admin
// writes; reads follow the owner's published state (see image-privacy.test.ts). Spec 005 refines the upload flow.

// 1x1 transparent PNG.
const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("storage bucket images", () => {
  it("accepts an upload from the admin and lets the admin read it back", async () => {
    const admin = await signedInClient(ADMIN);
    const path = `test/${uniqueSlug("f")}.png`;
    const up = await admin.storage
      .from("images")
      .upload(path, PNG, { contentType: "image/png" });
    expect(up.error).toBeNull();

    const down = await admin.storage.from("images").download(path);
    expect(down.error).toBeNull();

    const rm = await admin.storage.from("images").remove([path]);
    expect(rm.error).toBeNull();
  });

  it("rejects uploads from the public and from a non-admin user", async () => {
    for (const client of [anonClient(), await signedInClient(NON_ADMIN)]) {
      const up = await client.storage
        .from("images")
        .upload(`test/${uniqueSlug("f")}.png`, PNG, { contentType: "image/png" });
      expect(up.error).not.toBeNull();
    }
  });

  it("rejects files that are not images", async () => {
    const admin = await signedInClient(ADMIN);
    const up = await admin.storage
      .from("images")
      .upload(`test/${uniqueSlug("f")}.txt`, new Blob(["hola"]), {
        contentType: "text/plain",
      });
    expect(up.error).not.toBeNull();
  });
});
