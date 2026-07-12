import type { TemplateInfo, OcrEngineRecord } from "@/lib/types/ocr";
import { gcvEngine } from "@/lib/ocr/engines/gcv";
import { claudeGridEngine } from "@/lib/ocr/engines/claude-grid";
import { claudePlainEngine } from "@/lib/ocr/engines/claude-plain";

export interface OrchestratorResult {
  engines: OcrEngineRecord[];
  proposedText: string;
  primaryId: string;
}

/** secondary(GCV)併走を有効にするか（コスト予算で停止可能） */
const SECONDARY_ENABLED = process.env.OCR_SECONDARY_ENABLED !== "false";

/**
 * template.kind で primary を決め、原稿用紙なら GCV を併走させて全結果を保存する。
 * proposedText は primary から生成。primary が空文字なら claude-plain へ縮退。
 * @param base64 正規化済み画像base64
 * @param template 検出結果
 * @returns エンジン結果配列と proposedText
 */
export async function runOcr(base64: string, template: TemplateInfo): Promise<OrchestratorResult> {
  const toRecord = (e: { id: string; model: string; promptVersion: string }, r: Awaited<ReturnType<typeof gcvEngine.run>>): OcrEngineRecord => ({
    engineId: e.id as OcrEngineRecord["engineId"],
    model: e.model,
    promptVersion: e.promptVersion,
    ...r,
  });

  const primaryEngine = template.kind === "genko" ? claudeGridEngine : claudePlainEngine;
  const tasks: Promise<OcrEngineRecord>[] = [
    primaryEngine.run({ base64, template }).then((r) => toRecord(primaryEngine, r)),
  ];
  if (template.kind === "genko" && SECONDARY_ENABLED) {
    tasks.push(gcvEngine.run({ base64, template }).then((r) => toRecord(gcvEngine, r)));
  }
  const engines = await Promise.all(tasks);

  let proposedText = engines.find((e) => e.engineId === primaryEngine.id)?.text ?? "";
  // primary が空 → claude-plain へ縮退（既に plain が primary の場合は GCV, さらに空なら空のまま）
  if (!proposedText.trim()) {
    const fallback = await claudePlainEngine.run({ base64, template });
    const rec = toRecord(claudePlainEngine, fallback);
    if (!engines.some((e) => e.engineId === "claude-plain")) engines.push(rec);
    proposedText = fallback.text;
  }
  return { engines, proposedText, primaryId: primaryEngine.id };
}
