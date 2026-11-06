import assert from "node:assert/strict";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Optional local authoring tool. Reuses an installed Playwright package;
// neither Playwright nor these recordings are shipped in the app bundle.
// node scripts/capture-launch-assets.mjs [absolute/path/to/package.json] [local URL]
const require = createRequire(process.argv[2] || new URL("../package.json", import.meta.url));
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
  // A preference adds points; it need not outrank every other recipe total.
  // Capture the real result without claiming a guaranteed staple match.
  await capture("02-match-your-preference.png");
  await pause(6000);
  await page.getByText("Calculation & recommendation basis", { exact: true }).click();
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
    await recipePage.getByText("Calculation & recommendation basis", { exact: true }).click();
    await recipePage.evaluate(() => {
      const score = document.querySelector(".recommendation-score");
      window.scrollTo(0, scrollY + score.getBoundingClientRect().top - 24);
    });
    await recipePage.screenshot({ path: path.join(output, "03-inspect-the-basis.png") });
    assert.deepEqual(errors, []);
    await writeFile(path.join(output, "capture-notes.md"), `# Actual interface capture\n\nCaptured from a local preview on ${new Date().toISOString().slice(0, 10)}.\n\n- Three 1270 × 760 screenshots and one silent WebM recording of the unified recipe library.\n- Fresh isolated English workspace, no personal records or API key.\n- The video changes a staple preference, reads the calculation basis, saves a plan and revisits Plans. Timing is paced for readability, not a measured user result.\n- The preference contributes points but does not guarantee a matching recipe outranks every other total. The recording shows the actual result.\n- No external requests, invented outcomes, overlays or simulated AI responses.\n- Screenshot 3 is scrolled to the actual calculation panel.\n- These are review drafts; upload/publication is a separate step.\n`);
    console.log("Captured three gallery drafts and docs/launch/assets/mealhatch-demo.webm.");
  } finally {
    await browser.close();
  }
}
