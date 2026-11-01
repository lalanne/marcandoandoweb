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

// Issue #99, spec 002 criterion 67: a bigger header logo and a tab icon that
// reads at 32 px. Runs at 360 and 1280 px through the two Playwright projects.

test("[002-AC67] the header logo is large and sharp, and the header still fits", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator("header").getByRole("img", { name: /Marcando Ando/ });
  await expect(logo).toBeVisible();
  const viewport = page.viewportSize()!;
  const box = (await logo.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(viewport.width < 768 ? 56 : 72);

  // Sharp: the file served has at least as many pixels as the box shows.
  const natural = await logo.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(natural).toBeGreaterThanOrEqual(Math.ceil(box.width));

  // The header holds everything: no horizontal scroll, links still 44 px tall
  // targets are covered by the header-link tests; here the logo link is.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const logoLink = page.locator("header a").first();
  expect((await logoLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // No layout shift: the logo box has its size before the image loads, so a
  // reload does not move the header's height.
  const before = (await page.locator("header").boundingBox())!.height;
  await page.reload();
  expect((await page.locator("header").boundingBox())!.height).toBe(before);
});

test("[002-AC67] the browser-tab icon fills its square so it reads at 32 px", async ({
  page,
}) => {
  await page.goto("/");
  const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
  const url = new URL(href!, page.url()).toString();
  const fill = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, maxX = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    return (maxX - minX + 1) / width;
  }, url);
  // The drawing spans at least 95% of the icon's width (it was about 85% with
  // empty bands above and below).
  expect(fill).toBeGreaterThanOrEqual(0.95);
});
