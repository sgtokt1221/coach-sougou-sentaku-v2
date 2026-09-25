/**
 * 添削結果の判定欄から弱点（repeatedIssues）を足す、唯一の関数。
 *
 * AI の repeatedIssues だけだと、添削で見つけている「要求の欠落」「読み違い」
 * 「知識の誤り」「字数不足」「崩れた文」が重点弱点に届かなかった（2026-09-26 の
 * 点検で、要求の欠落15本・読み違い5件・知識の誤り6件・語の誤り18文が漏れていた）。
 *
 * 書き込み（review-core）・作り直し（rebuild-weaknesses）・集計（weakness-aggregate）・
 * 表示（添削結果の API）が全部これを通る。材料か規則がずれると、弱点DB・レポート・
 * 添削結果で回数が食い違う。
 *
 * 足す弱点の area は正規ラベルそのもの。AI が同じ弱点（正本の ID）を既に挙げていれば足さない。
 * 設計: docs/superpowers/specs/2026-09-26-weakness-taxonomy-v2-design.md
 */
import type {
  EssayFeedback,
  RepeatedIssue,
  TaskFulfillment,
} from "@/lib/types/essay";
import type { SentenceCheckResult } from "@/lib/essay/sentence-check-judge";
import {
  resolveCanonical,
  canonicalLabel,
  getTaxonomyEntry,
} from "@/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "@/lib/growth/weakness-category";
import { getLectureById } from "@/data/essay-lectures";

/** derive が読む判定欄（古い答案では欠けていることがある） */
export type DerivableFeedback = Pick<EssayFeedback, "repeatedIssues"> &
  Partial<
    Pick<
      EssayFeedback,
      | "taskFulfillment"
      | "reportInsights"
      | "knowledgeInsights"
      | "quantitativeAnalysis"
      | "claimChecks"
    >
  >;

export interface DeriveOptions {
  /**
   * 講座のブロック課題（1ブロックだけ書く）。答案全体を前提にした
   * 字数不足・要求の欠落は当てはまらないので足さない。主題ずれ（off_topic）
   * だけは積むが、narrower（主題の一部に限定）は1ブロックだけ書く課題では
   * 起きて当然なので積まない。different（別の話題）のときだけ積む
   */
  partial?: boolean;
}

/** 文の点検から弱点を積む閾値（1文だけは書き損じの可能性がある） */
const TWIST_MIN = 2;
const GRAMMAR_MIN = 2;
const TYPO_MIN = 3;
/** 字数が指定の何%未満で「大きく足りない」とするか */
const TOO_SHORT_RATE = 70;
/** message に載せる引用の上限字数 */
const QUOTE_MAX = 60;
/** 引用でなく説明文（主題ずれの note・読み違いの説明）を載せるときの上限字数 */
const NOTE_MAX = 120;
const MISREADING_MAX = 100;
/** 要求の欠落で並べて見せる件数の上限（超えた分は「ほかN件」） */
const REQUIREMENTS_SHOWN = 3;

/** 添削の判定欄から積みうる弱点の正本 ID（正本に存在することは verify-derive-issues.ts で担保） */
export const DERIVED_ISSUE_IDS = [
  "expression.twist",
  "expression.grammar",
  "expression.typo",
  "logic.contradiction",
  "structure.off_topic",
  "responsiveness.missing_requirement",
  "responsiveness.too_short",
  "responsiveness.misread",
  "responsiveness.knowledge_error",
] as const;
type DerivedIssueId = (typeof DERIVED_ISSUE_IDS)[number];

/** 引用が長いと message が読みにくくなるので、60字（既定）で切って「…」を付ける */
function clip(s: string, n: number = QUOTE_MAX): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/**
 * 設問の主題と答案の中心がどれだけずれているか。採点（review-core.ts の
 * reviewEssayCore 内、上限を決めている箇所）もこの関数を使う。
 *
 * 旧データは subjectMatch を持たないことがある。answersQuestion=false
 * （設問に正面から答えていない）なら different、それ以外は same として補う。
 * 採点側とこの規則がずれると、同じ答案で「点は下げたのに弱点は積まない」
 * （またはその逆）が起きるので、規則はここだけに置く。
 */
export function effectiveSubjectMatch(
  task:
    | Pick<TaskFulfillment, "subjectMatch" | "answersQuestion">
    | undefined
    | null
): "same" | "narrower" | "different" {
  return (
    task?.subjectMatch ??
    (task?.answersQuestion === false ? "different" : "same")
  );
}

/** 保存済みの答案が講座のブロック課題か（sourceType=lecture かつ課題が1ブロック） */
export function isPartialEssay(data: Record<string, unknown>): boolean {
  if (data.sourceType !== "lecture" || typeof data.lectureId !== "string")
    return false;
  return Boolean(getLectureById(data.lectureId)?.exercise.blockId);
}

export function deriveWeaknessIssues(
  feedback: DerivableFeedback,
  check: SentenceCheckResult | null | undefined,
  opts: DeriveOptions = {}
): RepeatedIssue[] {
  const issues = [...(feedback.repeatedIssues ?? [])];
  const present = new Set<string>();
  for (const i of issues) {
    const e = resolveCanonical(i.area ?? "", {
      categoryHint: i.category ?? categorizeWeakness(i.area ?? ""),
      supportText: i.message,
      domain: "essay",
    });
    if (e) present.add(e.id);
  }
  const add = (id: DerivedIssueId, message: string) => {
    if (present.has(id)) return;
    present.add(id);
    issues.push({
      area: canonicalLabel(id),
      category: getTaxonomyEntry(id)!.category as RepeatedIssue["category"],
      count: 1,
      message,
    });
  };

  // --- 文の点検 ---
  const broken = check?.brokenSentences ?? [];
  const twists = broken.filter((b) => b.kind === "twist");
  const grammar = broken.filter(
    (b) =>
      b.kind === "particle" ||
      b.kind === "collocation" ||
      b.kind === "unreadable"
  );
  const typos = broken.filter((b) => b.kind === "typo");
  if (twists.length >= TWIST_MIN)
    add(
      "expression.twist",
      `「${clip(twists[0].original)}」など、主語と述語が噛み合わない文が${twists.length}文あります。`
    );
  if (grammar.length >= GRAMMAR_MIN)
    add(
      "expression.grammar",
      `「${clip(grammar[0].original)}」など、助詞や語の使い方が崩れた文が${grammar.length}文あります。`
    );
  if (typos.length >= TYPO_MIN)
    add(
      "expression.typo",
      `「${clip(typos[0].original)}」など、誤字・脱字のある文が${typos.length}文あります。`
    );
  const contradiction = check?.contradictions?.[0];
  if (contradiction)
    add(
      "logic.contradiction",
      `「${clip(contradiction.first)}」と「${clip(contradiction.second)}」が食い違っている。`
    );

  // --- 判定欄 ---
  const task = feedback.taskFulfillment;
  const subjectMatch = effectiveSubjectMatch(task);
  // partial（ブロック課題）は narrower を除外する。理由は DeriveOptions.partial のコメント参照
  const offTopicApplies = opts.partial
    ? subjectMatch === "different"
    : subjectMatch !== "same";
  if (offTopicApplies)
    add(
      "structure.off_topic",
      task?.note
        ? clip(task.note, NOTE_MAX)
        : "設問の主題と答案の中心がずれている。"
    );
  if (!opts.partial) {
    const missing = (task?.requirements ?? []).filter(
      (r) => r.status === "missing"
    );
    if (missing.length > 0) {
      const shown = missing
        .slice(0, REQUIREMENTS_SHOWN)
        .map((r) => clip(r.requirement));
      const restCount = missing.length - shown.length;
      const quoted = shown.map((s) => `「${s}」`).join("");
      const rest = restCount > 0 ? `ほか${restCount}件` : "";
      add(
        "responsiveness.missing_requirement",
        `設問の${quoted}${rest}に答えていない。`
      );
    }
    const fillRate = feedback.quantitativeAnalysis?.fillRate;
    if (typeof fillRate === "number" && fillRate < TOO_SHORT_RATE)
      add(
        "responsiveness.too_short",
        `指定字数の${Math.round(fillRate)}%にとどまっている。`
      );
  }
  const misreadings = feedback.reportInsights?.misreadings ?? [];
  const contradicted = (feedback.claimChecks ?? []).filter(
    (c) => c.status === "contradicted"
  );
  if (misreadings.length > 0)
    add("responsiveness.misread", clip(misreadings[0], MISREADING_MAX));
  else if (contradicted.length > 0)
    add(
      "responsiveness.misread",
      `「${clip(contradicted[0].claim)}」が資料と食い違っている。`
    );
  const critical = (feedback.knowledgeInsights?.errors ?? []).filter(
    (e) => e.severity === "critical"
  );
  if (critical.length > 0)
    add(
      "responsiveness.knowledge_error",
      `「${clip(critical[0].claim)}」— ${clip(critical[0].correction)}`
    );

  return issues;
}
