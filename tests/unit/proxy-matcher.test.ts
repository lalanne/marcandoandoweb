import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

// Spec 002, 2026-11-06 amendment (issues #136 and #139), criterion 101: no database
// read runs before a public page's response starts, so the proxy guards only /panel.

describe("the proxy", () => {
  it("[002-AC101] matches only /panel and /panel/*", () => {
    expect(config.matcher).toEqual(["/panel", "/panel/:path*"]);
  });

  it("[002-AC101] reads no catalog and adds no Server-Timing", () => {
    const source = readFileSync(join(process.cwd(), "proxy.ts"), "utf8");
    expect(source).not.toMatch(/catalog|server-timing|createPublicClient|\/productos/i);
  });
});
