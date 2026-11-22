import { describe, expect, it } from "vitest";
import {
  isIgnoredConsoleError,
  isIgnoredRequest,
} from "../smoke/analytics-filter";

// Spec 004, criteria 13 and 20: only Vercel Web Analytics' script is left out of
// the smoke test's "no request fails" check.

const SITE = "https://marcandoandoweb.vercel.app";

describe("[004-AC20] smoke test filter for the Web Analytics script", () => {
  it("ignores the script's failed request and its 404", () => {
    expect(isIgnoredRequest(`${SITE}/_vercel/insights/script.js`)).toBe(true);
    expect(isIgnoredRequest(`${SITE}/_vercel/insights/view`)).toBe(true);
    expect(isIgnoredRequest("http://localhost:3000/_vercel/insights/script.js")).toBe(true);
  });

  it("still counts any other URL", () => {
    expect(isIgnoredRequest(`${SITE}/`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/img/foto.webp`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/api/health`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/_vercel/other/script.js`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/_vercel/insights`)).toBe(false);
  });

  it("does not ignore a URL that only contains the path elsewhere", () => {
    expect(isIgnoredRequest(`${SITE}/productos/_vercel/insights/script.js`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/?next=/_vercel/insights/script.js`)).toBe(false);
    expect(isIgnoredRequest(`${SITE}/img/a.webp#/_vercel/insights/script.js`)).toBe(false);
    expect(isIgnoredRequest("https://evil.test/x/_vercel/insights/script.js")).toBe(false);
  });

  it("does not ignore a value that is not a URL", () => {
    expect(isIgnoredRequest("")).toBe(false);
    expect(isIgnoredRequest("/_vercel/insights/script.js")).toBe(false);
  });

  it("ignores only the 'Failed to load resource' error located at the script", () => {
    const failed =
      "Failed to load resource: the server responded with a status of 404 ()";
    expect(isIgnoredConsoleError(failed, `${SITE}/_vercel/insights/script.js`)).toBe(true);
  });

  it("still counts every other console error", () => {
    const failed =
      "Failed to load resource: the server responded with a status of 404 ()";
    expect(isIgnoredConsoleError(failed, `${SITE}/img/foto.webp`)).toBe(false);
    expect(isIgnoredConsoleError(failed, `${SITE}/productos/_vercel/insights/x`)).toBe(false);
    expect(isIgnoredConsoleError(failed, "")).toBe(false);
    expect(isIgnoredConsoleError(failed, undefined)).toBe(false);
    expect(
      isIgnoredConsoleError("Uncaught TypeError: x is not a function", `${SITE}/_vercel/insights/script.js`),
    ).toBe(false);
    expect(
      isIgnoredConsoleError("Hydration failed", `${SITE}/_vercel/insights/script.js`),
    ).toBe(false);
  });
});
