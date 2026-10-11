/**
 * 出願書類の添削の指摘を、添削した本文の箇所に結び付ける（AIは呼ばない）。
 *
 * 以前の書類の添削結果は、点・総合評価・改善点が横のシートに並ぶだけで、
 * どの文への指摘かは改善点の「どこ」の文字を本文から探すしかなかった。
 * 赤ペンは保存していたのに生徒の画面には出ていなかった。
 *
 * 位置探しは小論文と同じ規則（空白・改行の違いを無視）を使う。
 * 改善点の location はプロンプトで本文の引用を求めているので（prompts/document.ts）、
 * 計算だけでほとんど決まる。決まらないものは「全体への指摘」に回す。
 */
import {
  buildSegments,
  findLoose,
  quotesIn,
  type Segment,
  type Span,
} from "@/lib/essay/feedback-anchors";
import type { DocumentFeedback } from "@/lib/types/document";

export type DocumentFeedbackGroup = "language" | "content" | "ap" | "interview";

export interface DocumentFeedbackItem {
  /** `${kind}:${元の配列での位置}` */
  key: string;
  kind: "language" | "improvement" | "ap" | "interview";
  index: number;
  group: DocumentFeedbackGroup;
  spans: Span[];
}

export interface DocumentFeedbackModel {
  items: DocumentFeedbackItem[];
  itemByKey: Map<string, DocumentFeedbackItem>;
  /** 本文に印を付けるもの */
  marked: DocumentFeedbackItem[];
  /** 本文に結び付かない「全体への指摘」（APの要素と面接の質問は専用の欄に出すので含めない） */
  unanchored: DocumentFeedbackItem[];
  segments: Segment[];
}

function spansOf(text: string, quotes: string[]): Span[] {
  const spans: Span[] = [];
  for (const q of quotes) {
    const s = q ? findLoose(text, q) : null;
    if (s && !spans.some((x) => x.start === s.start && x.end === s.end))
      spans.push(s);
  }
  return spans;
}

export function buildDocumentFeedbackModel(
  text: string,
  feedback: Partial<DocumentFeedback>
): DocumentFeedbackModel {
  const items: DocumentFeedbackItem[] = [];

  (feedback.languageCorrections ?? []).forEach((c, i) =>
    items.push({
      key: `language:${i}`,
      kind: "language",
      index: i,
      group: "language",
      spans: spansOf(text, [c.original]),
    })
  );

  (feedback.improvementDetails ?? []).forEach((d, i) =>
    items.push({
      key: `improvement:${i}`,
      kind: "improvement",
      index: i,
      group: "content",
      // 「全体」「第2段落」のような location は本文に無いので当たらず、全体に回る
      spans: spansOf(text, [
        d.location,
        ...quotesIn(d.location),
        ...quotesIn(d.problem),
      ]),
    })
  );

  (feedback.apMap ?? []).forEach((a, i) =>
    items.push({
      key: `ap:${i}`,
      kind: "ap",
      index: i,
      group: "ap",
      spans: a.evidence ? spansOf(text, [a.evidence]) : [],
    })
  );

  (feedback.interviewQuestions ?? []).forEach((q, i) =>
    items.push({
      key: `interview:${i}`,
      kind: "interview",
      index: i,
      group: "interview",
      spans: spansOf(text, [q.quote]),
    })
  );

  const marked = items.filter((it) => it.spans.length > 0);
  const unanchored = items.filter(
    // APと面接の質問は専用の欄に出すので全体には入れない
    (it) => it.spans.length === 0 && it.kind !== "ap" && it.kind !== "interview"
  );
  return {
    items,
    itemByKey: new Map(items.map((it) => [it.key, it])),
    marked,
    unanchored,
    segments: buildSegments(text.length, marked),
  };
}

/**
 * 赤ペンの直しを今の本文へ入れる。原文が最初に現れる1か所だけを置き換える。
 * 添削の後に本文を書き換えて原文が無くなっていれば null（入れられない）。
 */
export function applyCorrection(
  content: string,
  original: string,
  suggestion: string
): string | null {
  const at = content.indexOf(original);
  if (!original || at < 0) return null;
  return (
    content.slice(0, at) + suggestion + content.slice(at + original.length)
  );
}
