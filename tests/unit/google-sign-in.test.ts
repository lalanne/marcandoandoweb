import { describe, expect, it } from "vitest";
import {
  callbackFailed,
  decideAfterSignIn,
  providerAnswers,
  safeNextPath,
  siteOrigin,
} from "../../lib/auth/google";

describe("safeNextPath", () => {
  it("[005-AC8] keeps a relative path on this site", () => {
    expect(safeNextPath("/panel")).toBe("/panel");
    expect(safeNextPath("/panel/productos?x=1#a")).toBe("/panel/productos?x=1#a");
  });

  it("[005-AC8] falls back to /panel when there is no next", () => {
    expect(safeNextPath(null)).toBe("/panel");
    expect(safeNextPath(undefined)).toBe("/panel");
    expect(safeNextPath("")).toBe("/panel");
  });

  it.each([
    ["protocol-relative", "//evil.com"],
    ["protocol-relative with path", "//evil.com/panel"],
    ["backslash after slash", "/\\evil.com"],
    ["backslash anywhere", "/panel\\..\\x"],
    ["absolute https", "https://evil.com"],
    ["absolute http with the site host", "http://localhost:3000/panel"],
    ["javascript scheme", "javascript:alert(1)"],
    ["no leading slash", "panel"],
    ["encoded slashes", "/%2fevil.com"],
    ["encoded double slash", "%2f%2fevil.com"],
    ["encoded backslash", "/%5cevil.com"],
    ["double encoded slash", "/%252fevil.com"],
    ["tab inside", "/\t/evil.com"],
    ["newline inside", "/\n/evil.com"],
    ["control character", "/\u0000/evil.com"],
    ["space then slashes", "/ //evil.com"],
    ["malformed encoding", "/%E0%A4%A"],
  ])("[005-AC8] ignores %s (%s)", (_name, value) => {
    expect(safeNextPath(value)).toBe("/panel");
  });
});

describe("decideAfterSignIn", () => {
  it("[005-AC3] sends the admin to a safe next path or /panel", () => {
    const admin = { app_metadata: { role: "admin" } };
    expect(decideAfterSignIn(admin, null)).toEqual({
      path: "/panel",
      signOut: false,
    });
    expect(decideAfterSignIn(admin, "/panel/productos")).toEqual({
      path: "/panel/productos",
      signOut: false,
    });
    expect(decideAfterSignIn(admin, "//evil.com")).toEqual({
      path: "/panel",
      signOut: false,
    });
  });

  it("[005-AC12] decides the same for every admin, whoever they are", () => {
    for (const email of ["uno@marcandoando.test", "dos@marcandoando.test"]) {
      const user = { email, app_metadata: { role: "admin" } };
      expect(decideAfterSignIn(user, null).path).toBe("/panel");
    }
  });

  it("[005-AC4] signs out anyone who is not the admin", () => {
    const refused = { path: "/entrar?error=sin-acceso", signOut: true };
    expect(decideAfterSignIn({ app_metadata: {} }, "/panel")).toEqual(refused);
    expect(decideAfterSignIn({ app_metadata: { role: "cliente" } }, null)).toEqual(
      refused,
    );
    expect(decideAfterSignIn(null, null)).toEqual(refused);
  });

  it("[005-AC5] a role in user_metadata never makes an admin", () => {
    expect(
      decideAfterSignIn({ app_metadata: {}, user_metadata: { role: "admin" } }, null)
        .signOut,
    ).toBe(true);
  });
});

describe("callbackFailed", () => {
  const params = (q: string) => new URLSearchParams(q);

  it("[005-AC6] fails when the user cancelled or the provider returned an error", () => {
    expect(callbackFailed(params("error=access_denied&code=abc"))).toBe(true);
    expect(callbackFailed(params("error_code=bad_oauth_callback&code=abc"))).toBe(true);
    expect(callbackFailed(params("error_description=x"))).toBe(true);
  });

  it("[005-AC6] fails when there is no code", () => {
    expect(callbackFailed(params(""))).toBe(true);
    expect(callbackFailed(params("code="))).toBe(true);
  });

  it("[005-AC6] does not fail with a code and no error", () => {
    expect(callbackFailed(params("code=abc&next=%2Fpanel"))).toBe(false);
  });
});

describe("siteOrigin", () => {
  it("[005-AC2] prefers NEXT_PUBLIC_SITE_URL when it is set", () => {
    expect(
      siteOrigin("https://www.marcandoando.cl/algo", "http://internal:3000/x"),
    ).toBe("https://www.marcandoando.cl");
  });

  it("[005-AC2] uses the request origin when it is not set", () => {
    expect(siteOrigin(undefined, "http://localhost:3000/auth/google")).toBe(
      "http://localhost:3000",
    );
    expect(siteOrigin("", "http://localhost:3000/auth/google")).toBe(
      "http://localhost:3000",
    );
  });

  it("[005-AC2] ignores a value that is not an http(s) address", () => {
    expect(siteOrigin("javascript:alert(1)", "http://localhost:3000/x")).toBe(
      "http://localhost:3000",
    );
    expect(siteOrigin("not a url", "http://localhost:3000/x")).toBe(
      "http://localhost:3000",
    );
  });
});

describe("providerAnswers", () => {
  const answering = (status: number) =>
    (async () => new Response(null, { status })) as typeof fetch;

  it("[005-AC7] is true when the authorize URL redirects to the provider", async () => {
    expect(await providerAnswers("https://x.supabase.co/auth/v1/authorize", answering(302))).toBe(true);
  });

  it("[005-AC7] is false when the provider is disabled or misconfigured (4xx, 5xx)", async () => {
    for (const status of [400, 403, 404, 500, 502]) {
      expect(
        await providerAnswers("https://x.supabase.co/auth/v1/authorize", answering(status)),
        String(status),
      ).toBe(false);
    }
  });

  it("[005-AC7] is false when the request itself fails", async () => {
    const failing = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    expect(await providerAnswers("https://x.supabase.co/auth/v1/authorize", failing)).toBe(false);
  });

  it("[005-AC2] never follows the redirect to the provider", async () => {
    let init: RequestInit | undefined;
    const spy = (async (_url: string | URL | Request, options?: RequestInit) => {
      init = options;
      return new Response(null, { status: 302 });
    }) as typeof fetch;
    await providerAnswers("https://x.supabase.co/auth/v1/authorize", spy);
    expect(init?.redirect).toBe("manual");
    expect(init?.method).toBe("GET");
  });
});
