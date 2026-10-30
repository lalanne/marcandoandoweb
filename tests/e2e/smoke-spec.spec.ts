import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { withDemoPhotoFile } from "./supabase";

// Spec 004, criteria 12 to 16: the production smoke spec (tests/smoke) is itself
// tested here. It must pass against the healthy local server and fail, check by
// check, against a deliberately broken one. Runs once, not per viewport.

type Result = { status: number; failed: string[]; passed: string[]; output: string };

// Asynchronous on purpose: the crashed-site server lives in this process and
// must keep answering while the smoke run is going.
async function runSmoke(baseUrl: string): Promise<Result> {
  const dir = mkdtempSync(join(tmpdir(), "smoke-"));
  const jsonFile = join(dir, "results.json");
  // Drop the variables of the outer Playwright run so the inner one starts clean.
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(PW_|PLAYWRIGHT_|TEST_WORKER|FORCE_COLOR|PRODUCTION_URL)/.test(key)) {
      delete env[key];
    }
  }
  env.SMOKE_BASE_URL = baseUrl;
  env.SMOKE_RETRY_SECONDS = "0";
  env.SMOKE_RESULTS_FILE = jsonFile;
  const child = spawn(
    "npx",
    ["playwright", "test", "--config", "playwright.smoke.config.ts"],
    { env },
  );
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const status = await new Promise<number>((done) =>
    child.on("close", (code) => done(code ?? -1)),
  );
  const titles = { failed: [] as string[], passed: [] as string[] };
  const walk = (suite: {
    specs?: { title: string; ok: boolean }[];
    suites?: unknown[];
  }) => {
    for (const s of suite.specs ?? []) (s.ok ? titles.passed : titles.failed).push(s.title);
    for (const child of suite.suites ?? []) walk(child as typeof suite);
  };
  const report = JSON.parse(readFileSync(jsonFile, "utf8"));
  for (const suite of report.suites) walk(suite);
  return {
    status,
    ...titles,
    output,
  };
}

test.describe("production smoke spec", () => {
  // One worker for all of it: the demo photo file and the smoke output folder
  // are shared.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280", "runs once");
  });

  // The seed has the demo photo row but no file; without it the page makes a
  // request that fails, which the smoke spec rightly reports.
  let removePhoto: () => Promise<void> = async () => {};
  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "desktop-1280") return;
    removePhoto = await withDemoPhotoFile("demo/botella.webp");
  });
  test.afterAll(async () => removePhoto());

  test("[004-AC12] [004-AC13] [004-AC14] [004-AC15] [004-AC16] passes against the healthy local server", async ({
    baseURL,
  }) => {
    const result = await runSmoke(baseURL!);
    expect(result.output).toContain("passed");
    expect(result.failed).toEqual([]);
    expect(result.passed.length).toBeGreaterThanOrEqual(4);
    expect(result.status).toBe(0);
  });

  test.describe("against a crashed site", () => {
    let server: Server;
    let url: string;

    test.beforeAll(async () => {
      // The page-crash text with a 200, no redirect for /panel, health at 503.
      server = createServer((req, res) => {
        if (req.url === "/api/health") {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end('{"status":"error"}');
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<!doctype html><html lang=es><body><p>A server error occurred. Reload to try again.</p></body></html>",
        );
      });
      await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
      const address = server.address();
      url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    });
    test.afterAll(() => new Promise((ok) => server.close(ok)));

    test("[004-AC13] [004-AC14] [004-AC15] fails on the crash text, a missing redirect and a failing health route", async () => {
      const result = await runSmoke(url);
      expect(result.status).not.toBe(0);
      expect(result.output).toContain("Reload to try again");
      expect(result.failed.join("\n")).toContain("[004-AC13]");
      expect(result.failed.join("\n")).toContain("[004-AC14]");
      expect(result.failed.join("\n")).toContain("[004-AC15]");
    });
  });
});
