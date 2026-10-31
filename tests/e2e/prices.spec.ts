import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Spec 002, prices without "desde" and the wholesale note (criteria 52 and 53,
// issue #85). The page reads the fake seed data: every seeded product costs 1000.

const NOTE = "Precios por unidad. Al por mayor es otro precio: cotiza por WhatsApp.";
const SECTIONS = ["productos", "packs"] as const;

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Botella de ejemplo").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#packs article").first()).toBeVisible();
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

for (const viewport of [
  { name: "360", width: 360, height: 740 },
  { name: "1280", width: 1280, height: 800 },
]) {
  test.describe(`at ${viewport.name} px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`[002-AC52] a card's price reads "$1.000 c/u" and "desde" appears nowhere on the page (${viewport.name} px)`, async ({
      page,
    }) => {
      await open(page);
      const card = page.locator("#productos article").filter({ hasText: "Botella de ejemplo" });
      await expect(card.getByText("$1.000 c/u", { exact: true })).toBeVisible();
      const pack = page.locator("#packs article").filter({ hasText: "Pack regalo de ejemplo" });
      await expect(pack.getByText("$1.000 c/u", { exact: true })).toBeVisible();
      const text = await page.locator("body").innerText();
      expect(text.toLowerCase()).not.toContain("desde");
      await noHorizontalScroll(page);
      expect(await seriousViolations(page)).toEqual([]);
    });

    test(`[002-AC53] the wholesale note shows once, right under the Productos and Packs headings, readable (${viewport.name} px)`, async ({
      page,
    }) => {
      await open(page);
      for (const id of SECTIONS) {
        const section = page.locator(`#${id}`);
        const note = section.getByText(NOTE, { exact: true });
        await expect(note).toHaveCount(1);
        await expect(note).toBeVisible();
        // Right under the heading: the next element after the h2.
        const after = await section
          .locator("h2")
          .evaluate((h) => h.nextElementSibling?.textContent?.trim() ?? "");
        expect(after).toBe(NOTE);
        // Not repeated on the cards.
        await expect(section.locator("article").getByText(NOTE)).toHaveCount(0);
      }
      // Once per section, so twice on the page.
      await expect(page.getByText(NOTE, { exact: true })).toHaveCount(2);
      await noHorizontalScroll(page);
      // axe checks text contrast (4.5:1 for normal text) among the serious rules.
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}
