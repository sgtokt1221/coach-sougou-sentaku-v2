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
 * 旧 priority を新 usage に解釈する。usage が明示されていればそれを優先。
 * UI / 表示ロジックは `q.usage` を直接読まず必ずこれを経由する。
 */
export function resolveUsage(
  q: Pick<PracticeQuestion, "usage" | "priority">,
): "lesson" | "homework" | "extra" {
  if (q.usage) return q.usage;
  return q.priority === "primary" ? "lesson" : "homework";
}

/**
 * usage から answerVisibility の既定値を導出する。
 * - lesson / extra → teacher_only (授業中・予備は講師のみ)
 * - homework → after_submission (生徒が提出後に解答例公開)
 */
export function defaultAnswerVisibility(
  usage: "lesson" | "homework" | "extra",
): "teacher_only" | "after_submission" {
  return usage === "homework" ? "after_submission" : "teacher_only";
}

function validateDifficulty(
  d: unknown,
): "basic" | "standard" | "advanced" | undefined {
  return d === "basic" || d === "standard" || d === "advanced" ? d : undefined;
}

function validateUsage(
  u: unknown,
  fallback: "lesson" | "homework",
): "lesson" | "homework" | "extra" {
  return u === "lesson" || u === "homework" || u === "extra" ? u : fallback;
}

/**
 * AI が出力した PracticeQuestion オブジェクトを正規化するヘルパー。
 *
 * - id 未指定なら自動付与
 * - 必須フィールドの default
 * - undefined フィールドは Firestore に渡さない (削除)
 * - usage はサーバー側で fallback (primary→lesson, secondary→homework)
 * - answerVisibility はサーバー固定 (AI 判定させない)
 */
export function normalizePracticeQuestion(
  q: Partial<PracticeQuestion>,
  type: "essay" | "interview",
  priority: "primary" | "secondary",
  idPrefix: string,
  index: number,
  now: number,
): PracticeQuestion {
  const fallbackUsage: "lesson" | "homework" =
    priority === "primary" ? "lesson" : "homework";
  const usage = validateUsage(q.usage, fallbackUsage);

  const obj: PracticeQuestion = {
    id: q.id || `${idPrefix}_${now}_${index}`,
    type,
    priority,
    usage,
    title: q.title ?? "",
    relatedWeakness:
      q.relatedWeakness && q.relatedWeakness.trim().length > 0
        ? q.relatedWeakness
        : "弱点情報なし",
    answerVisibility: defaultAnswerVisibility(usage),
    order: index,
  };
  if (q.relatedPastTopic) obj.relatedPastTopic = q.relatedPastTopic;
  if (q.modelAnswer) obj.modelAnswer = q.modelAnswer;

  const difficulty = validateDifficulty(q.difficulty);
  if (difficulty) obj.difficulty = difficulty;

  if (typeof q.estimatedMinutes === "number" && q.estimatedMinutes > 0) {
    obj.estimatedMinutes = Math.round(q.estimatedMinutes);
  }
  if (q.objective && q.objective.trim().length > 0) obj.objective = q.objective;
  if (Array.isArray(q.rubric)) {
    const rubric = q.rubric
      .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      .slice(0, 5);
    if (rubric.length > 0) obj.rubric = rubric;
  }
  if (Array.isArray(q.hints)) {
    const hints = q.hints
      .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      .slice(0, 5);
    if (hints.length > 0) obj.hints = hints;
  }
  if (q.teacherNotes && q.teacherNotes.trim().length > 0) {
    obj.teacherNotes = q.teacherNotes;
  }
  // 面接の想定深掘り質問 (面接台本用)
  if (type === "interview" && Array.isArray(q.followUpQuestions)) {
    const fus = q.followUpQuestions
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .slice(0, 4);
    if (fus.length > 0) obj.followUpQuestions = fus;
  }

  return obj;
}

/**
 * AI 応答 JSON から PracticeQuestion[] を組み立てる共通ロジック。
 * primaryQuestions / secondaryQuestions の 2 つに分かれた応答に対応。
 *
 * fallback: AI が primaryQuestions を空 or 省略した場合、
 * secondaryQuestions の先頭 3 件を primary に昇格させる
 * (「全件 secondary バッジ」になる UX 問題を救済)。
 */
export function buildPracticeQuestionsFromJson(parsed: {
  primaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
  secondaryQuestions?: Array<Partial<PracticeQuestion> & { type?: string }>;
}): PracticeQuestion[] {
  const now = Date.now();
  const toType = (t: string | undefined): "essay" | "interview" =>
    t === "interview" ? "interview" : "essay";

  let primarySource = parsed.primaryQuestions ?? [];
  let secondarySource = parsed.secondaryQuestions ?? [];

  // primary 0 件 + secondary に複数あるなら、先頭 3 件を primary に昇格
  if (primarySource.length === 0 && secondarySource.length >= 1) {
    console.warn(
      "[practice-questions] AI returned 0 primaryQuestions; promoting first 3 of secondaryQuestions to primary",
    );
    primarySource = secondarySource.slice(0, 3);
    secondarySource = secondarySource.slice(3);
  }

  return [
    ...primarySource.map((q, i) =>
      normalizePracticeQuestion(q, toType(q.type), "primary", "pq_p", i, now),
    ),
    ...secondarySource.map((q, i) =>
      normalizePracticeQuestion(q, toType(q.type), "secondary", "pq_s", i, now),
    ),
  ]
    .filter((q) => q.title.trim().length > 0)
    .slice(0, 8);
}
