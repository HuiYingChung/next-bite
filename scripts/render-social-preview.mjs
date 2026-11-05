import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Optional authoring tool, not part of the app or CI. Reuse an installed
// Playwright package without adding a browser dependency to the product.
// node scripts/render-social-preview.mjs [path/to/package.json]
const require = createRequire(
  process.argv[2] || new URL("../package.json", import.meta.url),
);
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(new URL("../docs/launch/assets/social-preview.html", import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > 1200 ||
    document.documentElement.scrollHeight > 630,
  );
  if (overflow) throw new Error("Social preview exceeds the 1200 x 630 canvas.");
  await page.screenshot({
    path: fileURLToPath(new URL("../public/social-preview.png", import.meta.url)),
  });
  console.log("Rendered public/social-preview.png (1200 x 630).");
} finally {
  await browser.close();
}
