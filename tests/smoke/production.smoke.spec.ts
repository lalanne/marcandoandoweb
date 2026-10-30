import {
  expect,
  test as base,
  type APIResponse,
  type BrowserContext,
  type Page,
} from "@playwright/test";

// Spec 004, criteria 12 to 16: the post-deploy smoke test of the live site.
//
//   PRODUCTION_URL=https://marcandoandoweb.vercel.app npm run test:smoke
//
// Read-only on purpose: it only sends GET requests (a non-GET browser request is
// blocked and fails the test) and uses no credentials. Each check retries for up
// to SMOKE_RETRY_SECONDS (default 60) so the new deployment has time to go live.

const RETRY_SECONDS = Number(process.env.SMOKE_RETRY_SECONDS ?? 60);
const ERROR_TEXTS = ["Reload to try again", "A server error occurred"];

async function withRetries(check: () => Promise<void>) {
  if (RETRY_SECONDS <= 0) return check();
  await expect(check).toPass({
    timeout: RETRY_SECONDS * 1000,
    intervals: [1_000, 2_000, 4_000, 5_000],
  });
}

// Every request the test makes, by method. Browser requests of a non-GET method
// are aborted before they leave the machine.
const test = base.extend<{ methods: string[]; context: BrowserContext }>({
  methods: async ({}, provide) => provide([]),
  context: async ({ context, methods }, provide) => {
    await context.route("**/*", (route) => {
      const method = route.request().method();
      methods.push(method);
      return method === "GET" ? route.continue() : route.abort();
    });
    await provide(context);
  },
});

/** GET with the request fixture, recorded like the browser requests. */
async function get(
  page: Page,
  methods: string[],
  path: string,
): Promise<APIResponse> {
  methods.push("GET");
  return page.request.get(path, { maxRedirects: 0 });
}

test("[004-AC13] the home page loads without errors", async ({
  context,
  baseURL,
}) => {
  expect(baseURL, "Set PRODUCTION_URL (or SMOKE_BASE_URL)").toBeTruthy();
  await withRetries(async () => {
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    page.on("requestfailed", (r) =>
      problems.push(`request failed: ${r.url()}`),
    );
    page.on("response", (r) => {
      if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    try {
      const response = await page.goto("/");
      expect(response?.status(), "home page status").toBe(200);
      // Error texts first: when the page crashed, say so instead of reporting
      // a missing hero.
      const crashText = await page.locator("body").innerText();
      for (const bad of ERROR_TEXTS) {
        expect(crashText, `error text "${bad}" on the page`).not.toContain(bad);
      }
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Marcamos tus ideas",
      );
      await expect(
        page.getByRole("link", { name: "Cotizar por WhatsApp" }).first(),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      const text = await page.locator("body").innerText();
      for (const bad of ERROR_TEXTS) {
        expect(text, `error text "${bad}" on the page`).not.toContain(bad);
      }
      expect(problems, "console errors and failed requests").toEqual([]);
    } finally {
      await page.close();
    }
  });
});

test("[004-AC14] /panel redirects to /entrar when signed out", async ({
  context,
}) => {
  await withRetries(async () => {
    const page = await context.newPage();
    try {
      await page.goto("/panel");
      expect(new URL(page.url()).pathname).toBe("/entrar");
    } finally {
      await page.close();
    }
  });
});

test("[004-AC15] /api/health answers ok", async ({ page, methods }) => {
  await withRetries(async () => {
    const response = await get(page, methods, "/api/health");
    expect(response.status(), "health status").toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});

test("[004-AC16] sends only GET requests", async ({
  context,
  page,
  methods,
}) => {
  await withRetries(async () => {
    methods.length = 0;
    const home = await context.newPage();
    try {
      await home.goto("/");
      await home.goto("/panel");
      await get(page, methods, "/api/health");
    } finally {
      await home.close();
    }
    expect(methods.length, "requests were recorded").toBeGreaterThan(0);
    expect(methods.filter((m) => m !== "GET")).toEqual([]);
  });
});
