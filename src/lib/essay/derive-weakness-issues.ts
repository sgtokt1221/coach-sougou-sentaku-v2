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
import type { EssayFeedback, RepeatedIssue } from "@/lib/types/essay";
import type { SentenceCheckResult } from "@/lib/essay/sentence-check-judge";
import {
  resolveCanonical,
  canonicalLabel,
  getTaxonomyEntry,
} from "@/lib/growth/weakness-taxonomy";
import { categorizeWeakness } from "@/lib/growth/weakness-category";

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
   * 字数不足・要求の欠落は当てはまらないので足さない
   */
  partial?: boolean;
}

/** 文の点検から弱点を積む閾値（1文だけは書き損じの可能性がある） */
const TWIST_MIN = 2;
const GRAMMAR_MIN = 2;
const TYPO_MIN = 3;
/** 字数が指定の何%未満で「大きく足りない」とするか */
const TOO_SHORT_RATE = 70;

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
  const add = (id: string, message: string) => {
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
      `「${twists[0].original}」など、主語と述語が噛み合わない文が${twists.length}文あります。`
    );
  if (grammar.length >= GRAMMAR_MIN)
    add(
      "expression.grammar",
      `「${grammar[0].original}」など、助詞や語の使い方が崩れた文が${grammar.length}文あります。`
    );
  if (typos.length >= TYPO_MIN)
    add(
      "expression.typo",
      `「${typos[0].original}」など、誤字・脱字のある文が${typos.length}文あります。`
    );
  const contradiction = check?.contradictions?.[0];
  if (contradiction)
    add(
      "logic.contradiction",
      `「${contradiction.first}」と「${contradiction.second}」が食い違っている。`
    );

  // --- 判定欄 ---
  const task = feedback.taskFulfillment;
  if (task && task.subjectMatch && task.subjectMatch !== "same")
    add(
      "structure.off_topic",
      task.note || "設問の主題と答案の中心がずれている。"
    );
  if (!opts.partial) {
    const missing = (task?.requirements ?? []).filter(
      (r) => r.status === "missing"
    );
    if (missing.length > 0)
      add(
        "responsiveness.missing_requirement",
        `設問の「${missing.map((r) => r.requirement).join("」「")}」に答えていない。`
      );
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
  if (misreadings.length > 0) add("responsiveness.misread", misreadings[0]);
  else if (contradicted.length > 0)
    add(
      "responsiveness.misread",
      `「${contradicted[0].claim}」が資料と食い違っている。`
    );
  const critical = (feedback.knowledgeInsights?.errors ?? []).filter(
    (e) => e.severity === "critical"
  );
  if (critical.length > 0)
    add(
      "responsiveness.knowledge_error",
      `「${critical[0].claim}」— ${critical[0].correction}`
    );

  return issues;
}
