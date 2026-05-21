import type { PracticeQuestion } from "@/lib/types/growth-report";

/**
 * 今週の essay ドキュメントから「スコアが低かったカテゴリ下位 3 件」を抽出する。
 * 類題プロンプトに「今週優先で克服すべき項目」として渡す。
 */
export function computeThisWeekWeakItems(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Array<{ area: string; avgScore: number; essayCount: number }> {
  const cats = [
    "structure",
    "logic",
    "expression",
    "apAlignment",
    "originality",
  ] as const;
  const labels: Record<string, string> = {
    structure: "構成",
    logic: "論理性",
    expression: "表現力",
    apAlignment: "AP合致度",
    originality: "独自性",
  };
  const sums: Record<string, { sum: number; count: number }> = {};
  for (const d of docs) {
    const data = d.data() as { scores?: Record<string, number> };
    const s = data.scores;
    if (!s) continue;
    for (const c of cats) {
      if (typeof s[c] === "number") {
        sums[c] = sums[c] ?? { sum: 0, count: 0 };
        sums[c].sum += s[c];
        sums[c].count += 1;
      }
    }
  }
  return Object.entries(sums)
    .map(([key, v]) => ({
      area: labels[key] ?? key,
      avgScore: v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0,
      essayCount: v.count,
    }))
    .filter((x) => x.essayCount > 0)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);
}

/**
 * 面接ドキュメント配列から「AI 側 (assistant/ai) の主要質問」を抽出する。
 */
export function extractInterviewAssistantQuestions(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  limit: number,
): string[] {
  const out: string[] = [];
  for (const d of docs) {
    const data = d.data() as {
      messages?: Array<{ role?: string; content?: string }>;
    };
    data.messages
      ?.filter((m) => m?.role === "assistant" || m?.role === "ai")
      .forEach((m) => {
        const q = m.content?.split("\n")[0]?.slice(0, 80);
        if (q) out.push(q);
      });
  }
  return out.slice(0, limit);
}

/**
 * AI が出力した PracticeQuestion オブジェクトを正規化するヘルパー。
 *
 * - id 未指定なら自動付与
 * - 必須フィールドの default
 * - undefined フィールドは Firestore に渡さない (削除)
 *
 * priority は呼び出し側で primary / secondary を渡す。
 */
export function normalizePracticeQuestion(
  q: Partial<PracticeQuestion>,
  type: "essay" | "interview",
  priority: "primary" | "secondary",
  idPrefix: string,
  index: number,
  now: number,
): PracticeQuestion {
  const obj: PracticeQuestion = {
    id: q.id || `${idPrefix}_${now}_${index}`,
    type,
    priority,
    title: q.title ?? "",
    relatedWeakness:
      q.relatedWeakness && q.relatedWeakness.trim().length > 0
        ? q.relatedWeakness
        : "弱点情報なし",
  };
  if (q.relatedPastTopic) obj.relatedPastTopic = q.relatedPastTopic;
  if (q.modelAnswer) obj.modelAnswer = q.modelAnswer;
  return obj;
}

/**
 * AI 応答 JSON から PracticeQuestion[] を組み立てる共通ロジック。
 * primaryQuestions / secondaryQuestions の 2 つに分かれた応答に対応。
 */
export function buildPracticeQuestionsFromJson(parsed: {
  primaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
  secondaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
}): PracticeQuestion[] {
  const now = Date.now();
  const toType = (t: string | undefined): "essay" | "interview" =>
    t === "interview" ? "interview" : "essay";

  return [
    ...(parsed.primaryQuestions ?? []).map((q, i) =>
      normalizePracticeQuestion(q, toType(q.type), "primary", "pq_p", i, now),
    ),
    ...(parsed.secondaryQuestions ?? []).map((q, i) =>
      normalizePracticeQuestion(q, toType(q.type), "secondary", "pq_s", i, now),
    ),
  ]
    .filter((q) => q.title.trim().length > 0)
    .slice(0, 8);
}
