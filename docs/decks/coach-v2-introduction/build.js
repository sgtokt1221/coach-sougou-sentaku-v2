/**
 * Coach v2 紹介資料 ビルダー
 * slides.html を playwright で開き、各 section を PNG 化 → PptxGenJS で .pptx に貼り込み
 *
 * Usage:
 *   NODE_PATH="<work>/node_modules:<repo>/node_modules" node build.js
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const PptxGenJS = require("pptxgenjs");

const HERE = __dirname;
const HTML_PATH = path.join(HERE, "slides.html");
const SHOTS_DIR = path.join(HERE, "shots");
const OUT_PPTX = path.join(HERE, "..", "coach-v2-introduction.pptx");

// 720pt × 405pt の HTML を 2x scale で 1920×1080 相当の PNG にする
const VIEWPORT_W = 960;
const VIEWPORT_H = 540;

async function main() {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto("file://" + HTML_PATH, { waitUntil: "load" });

  // 全 section.slide を取得して数える
  const slideHandles = await page.$$("section.slide");
  const slideCount = slideHandles.length;
  console.log(`Detected ${slideCount} slides`);

  const shots = [];
  for (let i = 0; i < slideCount; i++) {
    const el = slideHandles[i];
    const out = path.join(SHOTS_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await el.screenshot({ path: out, omitBackground: false });
    shots.push(out);
    console.log(`  shot ${i + 1}/${slideCount} -> ${path.basename(out)}`);
  }
  await browser.close();

  // PptxGenJS で .pptx 生成 (各スライドに PNG を全面貼り込み)
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "COACH_16x9", width: 10, height: 5.625 });
  pptx.layout = "COACH_16x9";

  for (const shotPath of shots) {
    const slide = pptx.addSlide();
    slide.addImage({ path: shotPath, x: 0, y: 0, w: 10, h: 5.625 });
  }

  await pptx.writeFile({ fileName: OUT_PPTX });
  console.log(`\n[OK] Generated ${OUT_PPTX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
