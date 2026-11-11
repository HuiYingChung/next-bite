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
// Keeps the three options, buttons included, in the frame. They normally fit
// the first screen; when a reason line makes the cards taller, scroll past the
// site header as a whole instead of cutting it.
const showOptions = target => target.evaluate(() => {
  const grid = document.querySelector(".pick-grid");
  const needed = Math.max(0, Math.ceil(grid.getBoundingClientRect().bottom + scrollY - innerHeight));
  const header = Math.ceil(document.querySelector(".site-header").getBoundingClientRect().bottom + scrollY) + 1;
  window.scrollTo(0, needed === 0 ? 0 : Math.max(needed, header));
});
const capture = async name => {
  await page.mouse.move(0, 0);
  await showOptions(page);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".pick-card img").evaluateAll(images => Promise.all(images.map(image => image.complete || new Promise(resolve => { image.onload = image.onerror = resolve; }))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(output, name) });
};
const video = page.video();
let completed = false;
try {
  await page.goto(base.href);
  const choose = page.getByRole("button", { name: "Choose this meal", exact: true }).first();
  await choose.waitFor();
  assert.equal(await page.locator(".recommendation-mode select").count(), 0);
  assert.equal(await page.locator(".pick-card").count(), 3);
  assert.equal(await page.locator(".demo-banner").count(), 0);
  await capture("01-choose-a-meal.png");
  console.log("Captured the actual fresh first-use screen.");
  await pause(5000);

  await page.evaluate(() => window.scrollTo(0, 0));
  await pause(1000);
  const noodles = page.locator('.choice-row[data-choice="staple"] .choice-chip:has(input[value="noodles"])');
  await noodles.click();
  assert.equal(await noodles.locator("input").isChecked(), true);
  // Current-meal preference groups take priority over saved groups and nutrition.
  // Capture the real result without claiming a guaranteed staple match.
  await capture("02-match-your-preference.png");
  await pause(6000);
  await page.locator(".pick-details-toggle").first().click();
  await page.locator(".pick-detail").evaluate(node => node.scrollIntoView({ block: "start" }));
  await pause(2500);
  await page.getByText("Match & nutrition details", { exact: true }).click();
  await pause(5000);
  await showOptions(page);
  await pause(1500);
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
    await recipePage.getByRole("button", { name: "Choose this meal", exact: true }).first().waitFor();
    await recipePage.locator(".pick-details-toggle").first().click();
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
    await writeFile(path.join(output, "capture-notes.md"), `# Actual interface capture\n\nCaptured from a local preview on ${new Date().toISOString().slice(0, 10)}.\n\n- Four 1270 × 760 screenshots, one silent WebM recording and a 240 × 240 listing thumbnail rendered from the site icon.\n- Fresh isolated English workspace, no personal records or API key.\n- The video picks a staple with one tap, opens one option's details and its full match and nutrition calculation, saves a plan and revisits Plans. Timing is paced for readability, not a measured user result.\n- Current-meal match groups are compared before saved groups and the nutrition reference. The recording shows the actual result, with complete calculations available in a disclosure.\n- No external requests, invented outcomes, overlays or simulated AI responses.\n- Screenshots 1 and 2 show the three options with their buttons in a 760 px tall frame; at that height the card images are cropped, and screenshot 2 is scrolled past the site header because the reason line makes the cards taller. Screenshot 3 is scrolled to the actual calculation panel. Screenshot 4 is the printable recipe card opened from the same recommendation.
- Food images in the interface are AI-generated illustrations, as disclosed in the page footer and on each recipe card.\n- These are review drafts; upload/publication is a separate step.\n`);
    console.log("Captured four gallery drafts, the listing thumbnail and docs/launch/assets/mealhatch-demo.webm.");
  } finally {
    await browser.close();
  }
}
