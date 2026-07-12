/**
 * OCR精度評価CLI（手動実行, 実APIを叩く）。
 * 使い方: npx tsx scripts/eval-ocr.ts
 * 入力: evalset/images/<name>.jpg, evalset/groundtruth.json = { "<name>.jpg": { "text": "...", "expectedKind": "genko"|"plain" } }
 * 出力: コンソール表 ＋ evalset/report.json
 */
import fs from "node:fs";
import path from "node:path";
import { serverQualityCheck } from "@/lib/ocr/quality";
import { detectTemplate } from "@/lib/ocr/detect";
import { normalizeByCorners, deskewByAngle } from "@/lib/ocr/geometry";
import { runOcr } from "@/lib/ocr/orchestrator";
import { characterErrorRate } from "@/lib/ocr/text";

const ROOT = path.resolve("evalset");
const IMAGES = path.join(ROOT, "images");
const GT = path.join(ROOT, "groundtruth.json");

async function main() {
  if (!fs.existsSync(GT)) { console.error(`正解ファイルがありません: ${GT}`); process.exit(1); }
  const gt: Record<string, { text: string; expectedKind?: string }> = JSON.parse(fs.readFileSync(GT, "utf8"));
  const rows: Array<Record<string, unknown>> = [];
  let sumCer = 0, n = 0, templateMiss = 0;

  for (const [file, truth] of Object.entries(gt)) {
    const buf = fs.readFileSync(path.join(IMAGES, file));
    const base64 = buf.toString("base64");
    const qc = await serverQualityCheck(base64);
    const template = await detectTemplate(base64);
    let corrected = base64;
    if (template.kind === "genko" && template.corners) corrected = (await normalizeByCorners(base64, template.corners)) ?? base64;
    else if (template.skewAngle) corrected = await deskewByAngle(base64, template.skewAngle);
    const { engines, proposedText } = await runOcr(corrected, template);
    const cer = characterErrorRate(truth.text, proposedText);
    sumCer += cer; n++;
    if (truth.expectedKind && truth.expectedKind !== template.kind) templateMiss++;
    const latency = Math.max(...engines.map((e) => e.latencyMs));
    const cost = engines.reduce((s, e) => s + (e.costUsd ?? 0), 0);
    rows.push({ file, kind: template.kind, cer: cer.toFixed(3), qcPassed: qc.passed, latencyMs: latency, costUsd: cost.toFixed(4) });
    console.log(`${file}\tkind=${template.kind}\tCER=${cer.toFixed(3)}\tlat=${latency}ms`);
  }

  const summary = {
    count: n,
    meanCER: n ? sumCer / n : 0,
    templateMissRate: n ? templateMiss / n : 0,
  };
  console.log("\n=== SUMMARY ===");
  console.log(`件数: ${summary.count}  平均CER: ${summary.meanCER.toFixed(3)}  テンプレ誤判定率: ${(summary.templateMissRate * 100).toFixed(1)}%`);
  fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify({ summary, rows }, null, 2));
  console.log(`レポート: ${path.join(ROOT, "report.json")}`);
}

main();
