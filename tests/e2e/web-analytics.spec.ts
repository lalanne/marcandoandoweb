import { expect, test, type Page } from "@playwright/test";
import { ADMIN } from "./supabase";

// Spec 004, criterion 19: every page loads the Vercel Web Analytics script once.
// The component injects it on the client, and only a production build points it
// at /_vercel/insights/script.js (development loads a debug script from another
// host), so these tests are registered only against the production server
// (CI=1); a plain `npm run test:e2e` leaves them out.

const SCRIPT = 'script[src$="/_vercel/insights/script.js"]';

async function expectOneScript(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(SCRIPT), `${path} has the analytics script`).toHaveCount(1);
  // Still one after the page settles: it is not added twice.
  await page.waitForLoadState("networkidle");
  await expect(page.locator(SCRIPT)).toHaveCount(1);
}

if (process.env.CI) {
  test("[004-AC19] the public pages and /entrar load the analytics script once", async ({
    page,
  }) => {
    for (const path of ["/", "/productos/demo-polera-ejemplo", "/empresas", "/entrar"]) {
      await expectOneScript(page, path);
    }
  });

  test("[004-AC19] /panel, signed in as the admin, loads the analytics script once", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await page.getByLabel("Correo").fill(ADMIN.email);
    await page.getByLabel("Contraseña").fill(ADMIN.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/panel/);
    await expectOneScript(page, "/panel");
  });
}
