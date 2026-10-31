import { expect, test } from "@playwright/test";

// Issue #77: the header logo has no white box; the cream header shows through
// around it. The browser decodes the image and reads its corner pixels.

test("the header logo is transparent around the drawing and keeps its alt text", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator("header").getByRole("img", { name: /Marcando Ando/ });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute(
    "alt",
    "Marcando Ando, logo con una polera rosada con una M y un tazón morado",
  );

  const corners = await logo.evaluate(async (img: HTMLImageElement) => {
    const source = new Image();
    source.src = img.currentSrc || img.src;
    await source.decode();
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    const w = canvas.width - 1;
    const h = canvas.height - 1;
    return [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3]);
  });
  expect(corners).toEqual([0, 0, 0, 0]);

  // The header keeps its cream background behind the logo.
  const headerBg = await page
    .locator("header")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(headerBg).toBe("rgb(251, 245, 233)");
});
