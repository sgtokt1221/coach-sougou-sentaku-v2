/**
 * 添削の指摘を、答案本文の箇所に結び付ける（画面とサーバーで共用。AIは呼ばない）。
 *
 * 以前は赤ペン（languageCorrections）だけが本文に印を付け、改善点・弱点・知識の
 * 誤り・設問の要求などは本文と別の欄に散っていた。同じ文への指摘が、赤ペンでは
 * 「誤字」、弱点では「主語と述語のねじれ」と別の名前で出て、生徒が混乱していた。
 * すべての指摘を本文の箇所に結び付け、その箇所を押すと理由ごとに並べて見せる。
 *
 * 位置が計算で決まるもの（引用・根拠の一文・問の答えの範囲）はここで決め、
 * 決まらないものだけを AI 判定（feedback-anchor-judge.ts）に任せる。
 */
import type {
  EssayFeedback,
  FeedbackAnchorGroup,
  FeedbackAnchorItem,
  FeedbackAnchors,
  FeedbackItemKind,
  OralExamQuestionSet,
  RepeatedIssue,
} from "@/lib/types/essay";
import { splitOralExamAnswers } from "@/lib/essay/oral-exam-question";
import { pickDisplayIssues } from "@/lib/essay/display-issues";

/** 結び付けの作り方を変えたら上げる。保存済みの古い結び付けは作り直す */
export const FEEDBACK_ANCHORS_VERSION = 1;

export interface Span {
  start: number;
  end: number;
}

/** 本文に結び付ける前の指摘1件 */
export interface FeedbackItem {
  key: string;
  kind: FeedbackItemKind;
  /** 画面に出す本文（指摘の文面） */
  text: string;
  /** 計算で決まる理由のまとまり。決まらないものは AI 判定に任せる */
  group?: FeedbackAnchorGroup;
  /** 本文から探す手がかり（引用・根拠の一文など） */
  quotes: string[];
  /** 口頭試問の小問の判定のように、問の答え全体に結び付くもの */
  subQuestionNo?: number;
}

const WS = /[\s　]/;

/**
 * 空白・改行の違いを無視して quote を text から探す。
 * AI が引用するときに改行や字下げの全角空白を落とすことが多く、
 * 完全一致では当たらない。見つかった範囲は元の本文の位置で返す。
 */
export function findLoose(text: string, quote: string): Span | null {
  const q = quote.replace(/[\s　]/g, "");
  if (q.length < 4) return null;
  const map: number[] = [];
  let compact = "";
  for (let i = 0; i < text.length; i++) {
    if (WS.test(text[i])) continue;
    map.push(i);
    compact += text[i];
  }
  const at = compact.indexOf(q);
  if (at < 0) return null;
  return { start: map[at], end: map[at + q.length - 1] + 1 };
}

/** 「」で囲まれた引用（6字以上）を取り出す */
export function quotesIn(s: string | undefined | null): string[] {
  return [...String(s ?? "").matchAll(/「([^」]{6,})」/g)].map((m) => m[1]);
}

/** 本文を文に分け、位置付きで返す（AI 判定に番号付きで渡すのにも使う） */
export function sentenceSpans(text: string): (Span & { text: string })[] {
  const out: (Span & { text: string })[] = [];
  const re = /[^。！？!?\n]+[。！？!?」』）)]*/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (body.replace(/[。！？!?」』）)\s]/g, "").length < 4) continue;
    // 口頭試問の見出し（問1）は文として扱わない
    if (/^問\d+$/.test(body)) continue;
    const start = (m.index ?? 0) + lead;
    out.push({ start, end: start + body.length, text: body });
  }
  return out;
}

/** 弱点の軸から理由のまとまりを決める */
function groupOfIssue(r: RepeatedIssue): FeedbackAnchorGroup | undefined {
  switch (r.category) {
    case "expression":
      return "language";
    case "structure":
    case "logic":
    case "reasoningMaturity":
    case "originality":
      return "logic";
    case "responsiveness":
    case "apAlignment":
      return "task";
    default:
      return undefined;
  }
}

/**
 * 結果の各指摘をキー付きの一覧にする。
 * キーは `${kind}:${元の配列での位置}`。表示の側も同じ規則で引けるようにする。
 */
export function listFeedbackItems(
  feedback: Partial<EssayFeedback>
): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  const push = (it: Omit<FeedbackItem, "key"> & { index: number }) => {
    const { index, ...rest } = it;
    items.push({ key: `${it.kind}:${index}`, ...rest });
  };

  (feedback.languageCorrections ?? []).forEach((c, i) =>
    push({
      kind: "language",
      index: i,
      text: c.reason,
      group: "language",
      quotes: [c.original],
    })
  );

  if (feedback.priorityImprovement) {
    push({
      kind: "priority",
      index: 0,
      text: feedback.priorityImprovement,
      group: feedback.priorityTarget === "language" ? "language" : undefined,
      quotes: quotesIn(feedback.priorityImprovement),
    });
  }

  // 最優先の改善点が改善点1件目を指しているときは、同じ指摘を2回出さない（結果画面と同じ規則）
  const skipFirstImprovement =
    !!feedback.priorityImprovement && feedback.priorityTarget === "improvement";
  (feedback.improvements ?? []).forEach((s, i) => {
    if (skipFirstImprovement && i === 0) return;
    push({ kind: "improvement", index: i, text: s, quotes: quotesIn(s) });
  });

  // 弱点は結果画面と同じものだけを出す（derived の重複などを落とした後）
  const shownIssues = new Set(pickDisplayIssues(feedback.repeatedIssues ?? []));
  (feedback.repeatedIssues ?? []).forEach((r, i) => {
    if (!shownIssues.has(r)) return;
    push({
      kind: "weakness",
      index: i,
      text: r.message,
      group: groupOfIssue(r),
      quotes: quotesIn(r.message),
    });
  });

  (feedback.goodPoints ?? []).forEach((g, i) =>
    push({
      kind: "goodPoint",
      index: i,
      text: g,
      group: "good",
      quotes: quotesIn(g),
    })
  );

  (feedback.claimChecks ?? []).forEach((c, i) => {
    // 確認できた主張は指摘ではないので出さない
    if (c.status === "verified") return;
    push({
      kind: "claim",
      index: i,
      text: c.evidence ? `「${c.claim}」 ${c.evidence}` : `「${c.claim}」`,
      group: "knowledge",
      quotes: [c.claim, ...quotesIn(c.claim)],
    });
  });

  (feedback.taskFulfillment?.requirements ?? []).forEach((r, i) => {
    push({
      kind: "requirement",
      index: i,
      text: r.requirement,
      group: r.status === "met" ? "good" : "task",
      // 欠けている要求は本文に根拠が無いので、全体への指摘になる
      quotes: r.status === "missing" ? [] : [r.evidence],
    });
  });

  (feedback.knowledgeInsights?.errors ?? []).forEach((e, i) =>
    push({
      kind: "knowledge",
      index: i,
      text: e.correction,
      group: "knowledge",
      quotes: [e.claim, ...quotesIn(e.claim)],
    })
  );

  (feedback.oralExamInsights?.subQuestions ?? []).forEach((s, i) =>
    push({
      kind: "subQuestion",
      index: i,
      text: s.comment,
      group: s.verdict === "answered" ? "good" : "task",
      quotes: [],
      subQuestionNo: s.no,
    })
  );

  return items;
}

/**
 * 計算だけで位置を決める。決まらなかったものは spans が空のまま返す
 * （AI 判定の対象になる）。口頭試問の小問の判定は、その問の答え全体に付ける。
 */
export function anchorDeterministically(
  text: string,
  items: FeedbackItem[],
  oralExam?: OralExamQuestionSet | null
): Map<string, Span[]> {
  const result = new Map<string, Span[]>();
  const answerSpans = oralExam ? oralAnswerSpans(text, oralExam) : null;
  for (const it of items) {
    if (it.subQuestionNo !== undefined) {
      const span = answerSpans?.get(it.subQuestionNo);
      result.set(it.key, span ? [span] : []);
      continue;
    }
    const spans: Span[] = [];
    for (const q of it.quotes) {
      const s = q ? findLoose(text, q) : null;
      if (s && !spans.some((x) => x.start === s.start && x.end === s.end))
        spans.push(s);
    }
    result.set(it.key, spans);
  }
  return result;
}

/** 口頭試問の各問の答えが本文のどこにあるか */
export function oralAnswerSpans(
  text: string,
  set: OralExamQuestionSet
): Map<number, Span> {
  const out = new Map<number, Span>();
  const answers = splitOralExamAnswers(set, text);
  if (!answers) return out;
  set.subQuestions.forEach((q, i) => {
    const a = (answers[i] ?? "").trim();
    if (!a) return;
    const s = findLoose(text, a);
    if (s) out.set(q.no, s);
  });
  return out;
}

/** 計算で位置が決まらず、理由のまとまりも決まらない指摘か（AI 判定に回す） */
export function needsJudge(
  item: FeedbackItem,
  spans: Span[] | undefined
): boolean {
  if (item.kind === "requirement" || item.kind === "subQuestion") return false;
  return (spans?.length ?? 0) === 0 || !item.group;
}

/**
 * 計算の結果と AI 判定の結果を合わせて、保存する形にする。
 * AI 判定が無い（失敗した）ときは計算の分だけで作る。
 */
export function buildAnchors(
  items: FeedbackItem[],
  deterministic: Map<string, Span[]>,
  judged: Map<string, { spans: Span[]; group?: FeedbackAnchorGroup }> | null
): FeedbackAnchors {
  const out: FeedbackAnchorItem[] = items.map((it) => {
    const own = deterministic.get(it.key) ?? [];
    const j = judged?.get(it.key);
    return {
      key: it.key,
      group: it.group ?? j?.group ?? "logic",
      spans: own.length > 0 ? own : (j?.spans ?? []),
    };
  });
  return {
    version: FEEDBACK_ANCHORS_VERSION,
    generatedAt: new Date().toISOString(),
    judged: judged !== null,
    items: out,
  };
}

/** 本文の区間ごとに、そこへ付く指摘のキーをまとめる（重なった範囲は区切り直す） */
export interface Segment extends Span {
  keys: string[];
}

export function buildSegments(
  textLength: number,
  anchored: { key: string; spans: Span[] }[]
): Segment[] {
  const cuts = new Set<number>([0, textLength]);
  for (const a of anchored)
    for (const s of a.spans) {
      cuts.add(Math.max(0, Math.min(textLength, s.start)));
      cuts.add(Math.max(0, Math.min(textLength, s.end)));
    }
  const points = [...cuts].sort((x, y) => x - y);
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const keys = anchored
      .filter((a) => a.spans.some((s) => s.start < end && s.end > start))
      .map((a) => a.key);
    const prev = segs[segs.length - 1];
    // 同じ指摘の組が続く区間はつなげる（印を細切れにしない）
    if (prev && prev.end === start && sameKeys(prev.keys, keys)) {
      prev.end = end;
    } else {
      segs.push({ start, end, keys });
    }
  }
  return segs;
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k) => b.includes(k));
}
