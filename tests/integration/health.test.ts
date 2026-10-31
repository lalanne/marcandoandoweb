import { afterEach, describe, expect, it, vi } from "vitest";
import { healthResponse } from "@/lib/health";
import { localSupabase } from "./helpers";

// Spec 004, criterion 15: the health route reads the products with the public
// client and answers only ok or error, never a detail. Settings are injected, so
// a wrong URL or key is tested without touching the environment.

const { url, anonKey } = localSupabase;

async function expectError(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  // Exactly this body: no message, URL or key can ride along.
  expect(await response.text()).toBe('{"status":"error"}');
}

afterEach(() => vi.restoreAllMocks());

describe("[004-AC15] health check", () => {
  it("[004-AC15] reads the products table, not the categories", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const response = await healthResponse({ url, anonKey });
    expect(response.status).toBe(200);
    const paths = spy.mock.calls.map(([input]) =>
      new URL(input instanceof Request ? input.url : String(input)).pathname,
    );
    expect(paths).toContain("/rest/v1/product");
    expect(paths).not.toContain("/rest/v1/category");
  });

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
