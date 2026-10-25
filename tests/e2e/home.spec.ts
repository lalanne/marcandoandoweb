import { expect, test } from "@playwright/test";

test("home page is in Spanish and shows the brand name", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Marcando Ando",
  );
});
