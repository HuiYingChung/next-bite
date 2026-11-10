import assert from "node:assert/strict";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Optional local authoring tool. Reuses an installed Playwright package;
// neither Playwright nor these recordings are shipped in the app bundle.
// node scripts/capture-launch-assets.mjs [absolute/path/to/package.json] [local URL]
const require = createRequire(process.argv[2] ? path.resolve(process.argv[2]) : new URL("../package.json", import.meta.url));
const { chromium } = require("playwright");
const base = new URL(process.argv[3] || "http://127.0.0.1:5178/");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Capture a local preview only.");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "docs/launch/assets");
const recordings = path.join(root, "output/playwright/launch-experience/recordings");
await mkdir(output, { recursive: true });
await mkdir(recordings, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1270, height: 760 }, deviceScaleFactor: 1,
  reducedMotion: "reduce", recordVideo: { dir: recordings, size: { width: 1270, height: 760 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
// An isolated context has no personal records or key. Permit local assets only,
// including the development server, and exclude visit analytics and providers.
await page.route("**/*", route => {
  const url = new URL(route.request().url());
  return url.origin === base.origin && !url.pathname.startsWith("/_vercel/")
    ? route.continue() : route.abort();
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const capture = async name => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(output, name) });
};
const video = page.video();
let completed = false;
try {
  await page.goto(base.href);
  const choose = page.getByRole("button", { name: "Choose this meal", exact: true });
  await choose.waitFor();
  assert.equal(await page.locator(".recommendation-mode select").count(), 0);
  await page.locator(".recommendation-score").waitFor();
  assert.equal(await page.locator(".demo-banner").count(), 0);
  await capture("01-choose-a-meal.png");
  console.log("Captured the actual fresh first-use screen.");
  await pause(5000);

  await page.getByRole("combobox", { name: "Preferred staple", exact: true }).selectOption("noodles");
  assert.equal(await page.getByRole("combobox", { name: "Preferred staple", exact: true }).inputValue(), "noodles");
  // Current-meal preference groups take priority over saved groups and nutrition.
  // Capture the real result without claiming a guaranteed staple match.
  await capture("02-match-your-preference.png");
  await pause(6000);
  await page.getByText("Match & nutrition details", { exact: true }).click();
  await pause(5000);
  await choose.click();
  await pause(2000);
  await page.getByRole("button", { name: /^Plans/ }).click();
  await page.getByRole("heading", { name: "My next-meal plans", exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(6000);
  assert.deepEqual(errors, []);
  completed = true;
} finally {
  await context.close();
  if (!completed) await browser.close();
}
if (completed) {
  try {
    await copyFile(await video.path(), path.join(output, "mealhatch-demo.webm"));
    // Keep the video focused on one complete task. The detailed calculation
    // also gets its own still image for readable source/model inspection.
    const recipePage = await browser.newPage({ viewport: { width: 1270, height: 760 }, reducedMotion: "reduce" });
    await recipePage.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === base.origin && !url.pathname.startsWith("/_vercel/") ? route.continue() : route.abort();
    });
    recipePage.on("pageerror", error => errors.push(error.message));
    await recipePage.goto(base.href);
    await recipePage.getByRole("button", { name: "Choose this meal", exact: true }).waitFor();
    await recipePage.getByText("Match & nutrition details", { exact: true }).click();
    await recipePage.evaluate(() => {
      const score = document.querySelector(".recommendation-score");
      window.scrollTo(0, scrollY + score.getBoundingClientRect().top - 24);
    });
    await recipePage.screenshot({ path: path.join(output, "03-inspect-the-basis.png") });
    // The printable recipe card opens in a new tab; capture that same public link.
    const cardHref = await recipePage.getByRole("link", { name: /^Recipe card/ }).first().getAttribute("href");
    const cardUrl = new URL(cardHref);
    await recipePage.goto(new URL(`${cardUrl.pathname}${cardUrl.search}`, base).href);
    await recipePage.getByRole("button", { name: "Print / Save PDF", exact: true }).waitFor();
    await recipePage.evaluate(() => document.fonts.ready);
    await recipePage.locator(".recipe-card-page img").first().evaluate(image => image.complete || new Promise(resolve => { image.onload = image.onerror = resolve; })).catch(() => {});
    assert.equal(await recipePage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await recipePage.screenshot({ path: path.join(output, "04-print-the-recipe.png") });
    // Square listing thumbnail rendered from the site icon, with no added artwork.
    const icon = await readFile(path.join(root, "public/favicon.svg"), "utf8");
    const iconPage = await browser.newPage({ viewport: { width: 240, height: 240 }, deviceScaleFactor: 1 });
    await iconPage.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:240px;height:240px}</style>${icon}`);
    await iconPage.screenshot({ path: path.join(output, "thumbnail-240.png"), omitBackground: true });
    await iconPage.close();
    assert.deepEqual(errors, []);
    await writeFile(path.join(output, "capture-notes.md"), `# Actual interface capture\n\nCaptured from a local preview on ${new Date().toISOString().slice(0, 10)}.\n\n- Four 1270 × 760 screenshots, one silent WebM recording and a 240 × 240 listing thumbnail rendered from the site icon.\n- Fresh isolated English workspace, no personal records or API key.\n- The video changes a staple preference, opens the full match and nutrition calculation disclosure, saves a plan and revisits Plans. Timing is paced for readability, not a measured user result.\n- Current-meal match groups are compared before saved groups and the nutrition reference. The recording shows the actual result, with complete calculations available in a disclosure.\n- No external requests, invented outcomes, overlays or simulated AI responses.\n- Screenshot 3 is scrolled to the actual calculation panel. Screenshot 4 is the printable recipe card opened from the same recommendation.
- Food images in the interface are AI-generated illustrations, as disclosed in the page footer and on each recipe card.\n- These are review drafts; upload/publication is a separate step.\n`);
    console.log("Captured four gallery drafts, the listing thumbnail and docs/launch/assets/mealhatch-demo.webm.");
  } finally {
    await browser.close();
  }
}
