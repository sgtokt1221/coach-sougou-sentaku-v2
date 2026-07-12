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

  const primaryRec = engines.find((e) => e.engineId === primaryEngine.id);
  let proposedText = primaryRec?.text ?? "";
  let primaryId: string = primaryEngine.id;

  // primary が空 → フォールバック: grid→claude-plain / claude-plain→gcv。
  // 既に併走で結果があるエンジンは再実行せず再利用する。
  if (!proposedText.trim()) {
    const fallbackEngine = primaryEngine.id === "claude-plain" ? gcvEngine : claudePlainEngine;
    let rec = engines.find((e) => e.engineId === fallbackEngine.id);
    if (!rec) {
      rec = toRecord(fallbackEngine, await fallbackEngine.run({ base64, template }));
      engines.push(rec);
    }
    proposedText = rec.text;
    primaryId = rec.engineId;
  }

  return { engines, proposedText, primaryId };
}
