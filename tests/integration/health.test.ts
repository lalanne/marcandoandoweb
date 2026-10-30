import { describe, expect, it } from "vitest";
import { healthResponse } from "@/lib/health";
import { localSupabase } from "./helpers";

// Spec 004, criterion 15: the health route reads the categories with the public
// client and answers only ok or error, never a detail. Settings are injected, so
// a wrong URL or key is tested without touching the environment.

const { url, anonKey } = localSupabase;

async function expectError(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  // Exactly this body: no message, URL or key can ride along.
  expect(await response.text()).toBe('{"status":"error"}');
}

describe("[004-AC15] health check", () => {
  it("[004-AC15] answers 200 ok with correct settings", async () => {
    const response = await healthResponse({ url, anonKey });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("[004-AC15] answers 503 error with a wrong URL, without detail", async () => {
    await expectError(
      await healthResponse({ url: "http://127.0.0.1:1", anonKey }),
    );
  });

  it("[004-AC15] answers 503 error with a wrong key, without detail", async () => {
    await expectError(
      await healthResponse({ url, anonKey: "not-a-valid-key" }),
    );
  });

  it("[004-AC15] answers 503 error when the URL or key is missing", async () => {
    await expectError(await healthResponse({ url: undefined, anonKey }));
    await expectError(await healthResponse({ url, anonKey: undefined }));
    await expectError(await healthResponse({ url: "", anonKey: "" }));
  });

  it("[004-AC15] answers 503 error when the URL is not a URL", async () => {
    await expectError(await healthResponse({ url: "not a url", anonKey }));
  });
});
