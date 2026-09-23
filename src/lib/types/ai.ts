import type { AiUsageSummary } from "@/lib/ai/call-record";

export interface AiGenerationMetadata {
  promptVersion: string;
  schemaVersion: string;
  model: string;
  /** 生成に使ったトークンの合計（別呼び出しを含む）。2026-09-23 以降の記録だけにある */
  usage?: AiUsageSummary;
}
