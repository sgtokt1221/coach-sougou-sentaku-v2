/**
 * Playwright でオンボーディング用の画面スクリーンショットを撮る。
 *
 * 使い方: npx playwright test scripts/capture-screenshots.mjs
 * または: node scripts/capture-screenshots.mjs
 *
 * 前提: npm run dev が localhost:3000 で起動していること
 */

import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = "http://localhost:3000";
const OUT = join(import.meta.dirname, "..", "public", "onboarding-screens");

const PAGES = [
  { name: "self-analysis", path: "/student/self-analysis", waitFor: ".growth-leaf, .gt-leaf, [class*='GrowthTree'], h1" },
  { name: "essay", path: "/student/essay/new", waitFor: "h1" },
  { name: "interview", path: "/student/interview/new", waitFor: "h1" },
  { name: "matching", path: "/student/universities", waitFor: "h1" },
  { name: "documents", path: "/student/documents", waitFor: "h1" },
  { name: "dashboard", path: "/student/dashboard", waitFor: "h1" },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  const page = await context.newPage();

  // dev mode login: set devRole in localStorage via about:blank then navigate
  await page.goto("about:blank");
  await page.evaluate((base) => {
    // We need to set localStorage on the target origin
    window.__BASE = base;
  }, BASE);
  // Go to the app - first load will be slow (Turbopack compile)
  await page.goto(BASE + "/student/dashboard", { timeout: 60000, waitUntil: "domcontentloaded" });
  // Set devRole now that we're on the right origin
  await page.evaluate(() => {
    localStorage.setItem("devRole", "student");
  });
  // Reload to pick up devRole
  await page.reload({ timeout: 60000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  for (const pg of PAGES) {
    console.log(`Capturing ${pg.name}...`);
    try {
      await page.goto(BASE + pg.path, { waitUntil: "domcontentloaded", timeout: 60000 });
      // Wait for main content
      try {
        await page.waitForSelector(pg.waitFor, { timeout: 8000 });
      } catch {
        console.log(`  Selector "${pg.waitFor}" not found, proceeding anyway`);
      }
      await page.waitForTimeout(2000); // Let animations settle

      // Hide sidebar for cleaner screenshots on some pages
      await page.evaluate(() => {
        const sidebar = document.querySelector("aside");
        if (sidebar) sidebar.style.display = "none";
        const main = document.querySelector("main");
        if (main) main.style.marginLeft = "0";
      });
      await page.waitForTimeout(500);

      const outPath = join(OUT, `${pg.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`  Saved: ${outPath}`);
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  // Also capture mobile versions
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    colorScheme: "dark",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
  });
  await mobilePage.goto(BASE + "/student/dashboard", { timeout: 60000, waitUntil: "domcontentloaded" });
  await mobilePage.evaluate(() => {
    localStorage.setItem("devRole", "student");
  });
  await mobilePage.reload({ timeout: 60000, waitUntil: "domcontentloaded" });
  await mobilePage.waitForTimeout(5000);

  for (const pg of PAGES.slice(0, 3)) { // Just first 3 for mobile
    console.log(`Capturing mobile ${pg.name}...`);
    try {
      await mobilePage.goto(BASE + pg.path, { waitUntil: "domcontentloaded", timeout: 60000 });
      await mobilePage.waitForTimeout(2500);
      const outPath = join(OUT, `${pg.name}-mobile.png`);
      await mobilePage.screenshot({ path: outPath, fullPage: false });
      console.log(`  Saved: ${outPath}`);
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to public/onboarding-screens/");
}

main().catch(console.error);
