"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MessageSquare, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VERDICT_STYLE } from "@/components/essay/OralExamQuestionsCard";
import {
  anchorDeterministically,
  buildAnchors,
  buildSegments,
  listFeedbackItems,
  oralAnswerSpans,
  type FeedbackItem,
  type Segment,
  type Span,
} from "@/lib/essay/feedback-anchors";
import { charDiff } from "@/lib/text/char-diff";
import type {
  EssayFeedback,
  FeedbackAnchorGroup,
  FeedbackAnchors,
  OralExamQuestionSet,
} from "@/lib/types/essay";

/** 指摘を押したときに並べる順と見出し */
const GROUPS: { id: FeedbackAnchorGroup; label: string }[] = [
  { id: "language", label: "言葉" },
  { id: "logic", label: "論理・構成" },
  { id: "task", label: "設問への答え" },
  { id: "knowledge", label: "知識" },
  { id: "good", label: "良い点" },
];

/** 本文の印の色。区間に複数のまとまりがあるときは、この順で先のものを出す */
const MARK_PRIORITY: FeedbackAnchorGroup[] = [
  "knowledge",
  "language",
  "task",
  "logic",
  "good",
];
const MARK_STYLE: Record<FeedbackAnchorGroup, string> = {
  language: "decoration-rose-500",
  logic: "decoration-amber-500",
  task: "decoration-violet-500",
  knowledge: "decoration-sky-600",
  good: "decoration-emerald-500",
};
const DOT_STYLE: Record<FeedbackAnchorGroup, string> = {
  language: "bg-rose-500",
  logic: "bg-amber-500",
  task: "bg-violet-500",
  knowledge: "bg-sky-600",
  good: "bg-emerald-500",
};

/** 事実の確認の状態。「実在しない」とは断定せず、確認できたかで言う */
const CLAIM_STATUS: Record<string, string> = {
  verified: "資料で確認できた",
  contradicted: "資料と食い違う",
  unverified: "確認できない",
  not_checkable: "本人の経験",
};

const REQUIREMENT_STATUS: Record<string, string> = {
  met: "満たしている",
  partial: "一部だけ",
  missing: "欠けている",
};

/**
 * 添削の指摘を本文に結び付けて見せる（詳細の表示）。
 *
 * 左に本文を置き、指摘のある箇所に印を付ける。印を押すと、その箇所への指摘が
 * 理由ごと（言葉／論理・構成／設問への答え／知識／良い点）に並ぶ。
 * 右には全体講評と、本文に結び付かない指摘（構成や、書かれていないことへの指摘）を置く。
 * スマホは「本文」「全体」のタブで切り替え、印を押すと下からシートで出す。
 *
 * 結び付けが保存されていなければ、計算で決まる分だけで先に出し、
 * AI で補った結び付けが届いたら差し替える。
 */
export function AnchoredFeedbackView({
  text,
  feedback,
  anchors,
  anchorsPending,
  oralExam,
  rightExtra,
}: {
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  /** AI で補った結び付けを作っている最中か */
  anchorsPending: boolean;
  oralExam?: OralExamQuestionSet | null;
  /** 右の欄の下に足す、指摘以外の情報（課題文の扱い・専門知識の点など） */
  rightExtra?: ReactNode;
}) {
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mobileTab, setMobileTab] = useState<"text" | "global">("text");
  /**
   * PC では選んだ箇所の指摘を右の欄に出し、スマホでは下からのシートで出す。
   * シートを CSS で隠すだけだと、背景をぼかす幕は PC でも開いてしまうので、
   * 画面幅で開くかどうかを決める。
   */
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const items = useMemo(() => listFeedbackItems(feedback), [feedback]);
  const itemByKey = useMemo(
    () => new Map(items.map((i) => [i.key, i])),
    [items]
  );
  const effective = useMemo(
    () =>
      anchors ??
      buildAnchors(items, anchorDeterministically(text, items, oralExam), null),
    [anchors, items, text, oralExam]
  );
  const groupOf = useMemo(
    () => new Map(effective.items.map((a) => [a.key, a.group])),
    [effective]
  );
  // 小問の判定は印にせず、問の見出しに出す（答え全体を塗ると本文が読めない）
  const marked = effective.items.filter(
    (a) => a.spans.length > 0 && itemByKey.get(a.key)?.kind !== "subQuestion"
  );
  const unanchored = effective.items.filter(
    (a) =>
      a.spans.length === 0 &&
      // 問の見出しに出せる小問の判定は全体に回さない
      !(itemByKey.get(a.key)?.kind === "subQuestion" && oralExam)
  );
  const segments = useMemo(
    () => buildSegments(text.length, marked),
    [text.length, marked]
  );

  const answerSpans = useMemo(
    () => (oralExam ? oralAnswerSpans(text, oralExam) : null),
    [text, oralExam]
  );

  const select = (keys: string[]) => setSelected(keys);

  const renderRange = (range: Span) =>
    segments
      .filter((s) => s.end > range.start && s.start < range.end)
      .map((s) => (
        <SegmentText
          key={`${s.start}-${s.end}`}
          segment={s}
          text={text.slice(
            Math.max(s.start, range.start),
            Math.min(s.end, range.end)
          )}
          groupOf={groupOf}
          active={!!selected && sameKeys(selected, s.keys)}
          onSelect={select}
        />
      ));

  const essayPane = (
    <Card>
      <CardContent className="space-y-4 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            あなたの答案
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              印を押すと、その箇所への指摘が見られます
            </span>
          </p>
          <Legend />
        </div>
        {anchorsPending && (
          <p className="text-muted-foreground text-xs">
            指摘を本文に配置しています…
          </p>
        )}
        {oralExam && answerSpans && answerSpans.size > 0 ? (
          <div className="space-y-5">
            {oralExam.subQuestions.map((q) => {
              const span = answerSpans.get(q.no);
              const verdict = feedback.oralExamInsights?.subQuestions?.find(
                (v) => v.no === q.no
              );
              const style = verdict ? VERDICT_STYLE[verdict.verdict] : null;
              return (
                <div key={q.no} className="space-y-2">
                  <div className="bg-muted/50 space-y-1 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">問{q.no}</span>
                      {style && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${style.className}`}
                        >
                          {style.label}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {q.prompt}
                    </p>
                    {verdict?.comment && (
                      <p className="text-xs leading-relaxed">
                        {verdict.comment}
                      </p>
                    )}
                  </div>
                  <p className="text-[15px] leading-8 whitespace-pre-wrap">
                    {span ? (
                      renderRange(span)
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        未記入
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[15px] leading-8 whitespace-pre-wrap">
            {renderRange({ start: 0, end: text.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const spanPanel = selected ? (
    <GroupedItems
      keys={selected}
      itemByKey={itemByKey}
      groupOf={groupOf}
      feedback={feedback}
    />
  ) : null;

  const globalPane = (
    <div className="space-y-4">
      {feedback.overall && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-sky-600" />
              全体講評
            </p>
            <p className="text-sm leading-relaxed">{feedback.overall}</p>
          </CardContent>
        </Card>
      )}
      {marked.length > 0 && (
        <p className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
          本文に <span className="font-semibold">{marked.length}件</span>{" "}
          の指摘があります。答案の印を押すと内容が見られます。
        </p>
      )}
      {feedback.taskFulfillment &&
        !feedback.taskFulfillment.answersQuestion &&
        feedback.taskFulfillment.note && (
          <Card>
            <CardContent className="space-y-1 p-4">
              <p className="text-sm font-semibold text-violet-700">
                設問への答え
              </p>
              <p className="text-sm leading-relaxed">
                {feedback.taskFulfillment.note}
              </p>
            </CardContent>
          </Card>
        )}
      {unanchored.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">答案全体への指摘</p>
            <GroupedItems
              keys={unanchored.map((a) => a.key)}
              itemByKey={itemByKey}
              groupOf={groupOf}
              feedback={feedback}
            />
          </CardContent>
        </Card>
      )}
      {rightExtra}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="lg:hidden">
        <SegmentControl
          fullWidth
          size="sm"
          value={mobileTab}
          onChange={(v) => setMobileTab(v as "text" | "global")}
          options={[
            { id: "text", label: "本文", count: marked.length },
            { id: "global", label: "全体", count: unanchored.length },
          ]}
        />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start lg:gap-6">
        <div className={mobileTab === "text" ? "" : "hidden lg:block"}>
          {essayPane}
        </div>
        <div
          className={`space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto ${
            mobileTab === "global" ? "" : "hidden lg:block"
          }`}
        >
          {spanPanel && (
            <Card className="hidden border-slate-300 lg:block">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">選んだ箇所への指摘</p>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="閉じる"
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {spanPanel}
              </CardContent>
            </Card>
          )}
          {globalPane}
        </div>
      </div>
      {/* スマホ: 印を押したら下から出す */}
      <Sheet
        open={!!selected && !isDesktop}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[80vh] lg:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle>この箇所への指摘</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">{spanPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((k) => b.includes(k));
}

function SegmentText({
  segment,
  text,
  groupOf,
  active,
  onSelect,
}: {
  segment: Segment;
  text: string;
  groupOf: Map<string, FeedbackAnchorGroup>;
  active: boolean;
  onSelect: (keys: string[]) => void;
}) {
  if (segment.keys.length === 0) return <span>{text}</span>;
  const groups = new Set(segment.keys.map((k) => groupOf.get(k)));
  const top = MARK_PRIORITY.find((g) => groups.has(g)) ?? "logic";
  /**
   * button 要素は全体の書式で inline-block になり、印ごとに1つの塊として折り返されて
   * 文の途中で改行される。文の流れのまま折り返すよう span にし、押せる要素として扱う。
   */
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => onSelect(segment.keys)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(segment.keys);
        }
      }}
      data-feedback-mark
      className={[
        "cursor-pointer rounded-sm underline decoration-2 underline-offset-4 transition-colors",
        top === "good" ? "decoration-solid" : "decoration-wavy",
        MARK_STYLE[top],
        active ? "bg-amber-100 dark:bg-amber-900/40" : "hover:bg-muted",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function Legend() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {GROUPS.map((g) => (
        <span key={g.id} className="inline-flex items-center gap-1">
          <span className={`size-2 rounded-full ${DOT_STYLE[g.id]}`} />
          {g.label}
        </span>
      ))}
    </div>
  );
}

/** 指摘を理由のまとまりごとに並べる */
function GroupedItems({
  keys,
  itemByKey,
  groupOf,
  feedback,
}: {
  keys: string[];
  itemByKey: Map<string, FeedbackItem>;
  groupOf: Map<string, FeedbackAnchorGroup>;
  feedback: Partial<EssayFeedback>;
}) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const inGroup = keys.filter((k) => groupOf.get(k) === g.id);
        if (inGroup.length === 0) return null;
        return (
          <div key={g.id} className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`size-2 rounded-full ${DOT_STYLE[g.id]}`} />
              {g.label}
            </p>
            {inGroup.map((k) => {
              const it = itemByKey.get(k);
              return it ? (
                <ItemCard key={k} item={it} feedback={feedback} />
              ) : null;
            })}
          </div>
        );
      })}
    </div>
  );
}

function kindLabel(
  item: FeedbackItem,
  feedback: Partial<EssayFeedback>
): string {
  const index = Number(item.key.split(":")[1]);
  switch (item.kind) {
    case "language":
      return "赤ペン";
    case "priority":
      return "最優先で直すところ";
    case "improvement":
      return "改善点";
    case "weakness":
      return "くり返し出ている弱点";
    case "goodPoint":
      return "良い点";
    case "claim": {
      const c = feedback.claimChecks?.[index];
      return `事実の確認（${CLAIM_STATUS[c?.status ?? ""] ?? ""}）`;
    }
    case "requirement": {
      const r = feedback.taskFulfillment?.requirements?.[index];
      return `設問の要求（${REQUIREMENT_STATUS[r?.status ?? ""] ?? ""}）`;
    }
    case "knowledge":
      return "知識の誤り";
    case "subQuestion":
      return `問${item.subQuestionNo}の判定`;
  }
}

function ItemCard({
  item,
  feedback,
}: {
  item: FeedbackItem;
  feedback: Partial<EssayFeedback>;
}) {
  const index = Number(item.key.split(":")[1]);
  const label = kindLabel(item, feedback);
  if (item.kind === "language") {
    const c = feedback.languageCorrections?.[index];
    if (!c) return null;
    return (
      <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
        <p className="text-muted-foreground text-[11px]">{label}</p>
        <p className="text-sm leading-relaxed">
          {charDiff(c.original, c.suggestion).map((p, i) =>
            p.type === "same" ? (
              <span key={i}>{p.text}</span>
            ) : p.type === "del" ? (
              <span key={i} className="text-rose-600 line-through">
                {p.text}
              </span>
            ) : (
              <span key={i} className="font-semibold text-rose-600">
                {p.text}
              </span>
            )
          )}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {c.reason}
        </p>
      </div>
    );
  }
  if (item.kind === "knowledge") {
    const e = feedback.knowledgeInsights?.errors?.[index];
    if (!e) return null;
    return (
      <div className="bg-muted/40 space-y-1 rounded-lg p-3">
        <p className="text-muted-foreground text-[11px]">
          {label}
          {e.severity === "critical" ? "（重大）" : ""}
        </p>
        <p className="text-sm font-medium">「{e.claim}」</p>
        <p className="text-sm leading-relaxed">{e.correction}</p>
      </div>
    );
  }
  return (
    <div className="bg-muted/40 space-y-1 rounded-lg p-3">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-sm leading-relaxed">{item.text}</p>
    </div>
  );
}
