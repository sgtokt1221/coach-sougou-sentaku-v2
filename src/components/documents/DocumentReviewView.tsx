"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { charDiff } from "@/lib/text/char-diff";
import {
  applyCorrection,
  buildDocumentFeedbackModel,
  type DocumentFeedbackGroup,
  type DocumentFeedbackItem,
} from "@/lib/documents/feedback-anchors";
import type { Segment } from "@/lib/essay/feedback-anchors";
import type { DocumentApMapItem, DocumentFeedback } from "@/lib/types/document";

const GROUPS: { id: DocumentFeedbackGroup; label: string }[] = [
  { id: "language", label: "言葉" },
  { id: "content", label: "内容・構成" },
  { id: "ap", label: "AP" },
];
/** 区間に複数のまとまりがあるときは、この順で先のものの色で出す */
const MARK_PRIORITY: DocumentFeedbackGroup[] = ["language", "content", "ap"];
const MARK_STYLE: Record<DocumentFeedbackGroup, string> = {
  language: "decoration-rose-500",
  content: "decoration-amber-500",
  ap: "decoration-violet-500",
};
const DOT_STYLE: Record<DocumentFeedbackGroup, string> = {
  language: "bg-rose-500",
  content: "bg-amber-500",
  ap: "bg-violet-500",
};

const AP_STATUS: Record<
  DocumentApMapItem["status"],
  { label: string; className: string }
> = {
  met: {
    label: "応えている",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  partial: {
    label: "一部だけ",
    className:
      "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200",
  },
  missing: {
    label: "書かれていない",
    className:
      "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  },
};

/** 2列で並べられる幅か。狭いときは選んだ箇所の指摘を下からのシートで出す */
function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * 書類の添削結果を、添削した本文の上で読む画面。
 *
 * 本文の指摘箇所に印を付け、押すとその箇所への赤ペン・改善点・APの要素が並ぶ。
 * 横には総合評価・APとの対応表・本文に結び付かない指摘を置く。
 * 赤ペンは「本文に入れる」で、編集中の本文へそのまま反映できる。
 */
export function DocumentReviewView({
  reviewedText,
  feedback,
  currentContent,
  onApply,
}: {
  /** 添削した時点の本文。印はこちらに付ける */
  reviewedText: string;
  feedback: DocumentFeedback;
  /** 編集中の本文。赤ペンを入れられるかの判定と置き換えに使う */
  currentContent: string;
  onApply: (nextContent: string) => void;
}) {
  const model = useMemo(
    () => buildDocumentFeedbackModel(reviewedText, feedback),
    [reviewedText, feedback]
  );
  const [selected, setSelected] = useState<string[] | null>(null);
  const isWide = useIsWide();

  /** 対応表の行から、本文の印へ送る */
  const focusItem = (item: DocumentFeedbackItem) => {
    setSelected([item.key]);
    document
      .querySelector(`[data-mark-keys~="${item.key}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const itemList = (keys: string[]) => (
    <GroupedItems
      keys={keys}
      model={model}
      feedback={feedback}
      currentContent={currentContent}
      onApply={onApply}
    />
  );

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-5">
      <p className="text-[15px] leading-8 whitespace-pre-wrap">
        {model.segments.map((s) => (
          <SegmentText
            key={`${s.start}-${s.end}`}
            segment={s}
            text={reviewedText.slice(s.start, s.end)}
            groupOf={(k) => model.itemByKey.get(k)?.group}
            active={!!selected && sameKeys(selected, s.keys)}
            onSelect={setSelected}
          />
        ))}
      </p>

      <div className="mt-6 space-y-5 xl:sticky xl:top-4 xl:mt-0 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
        {selected && isWide && (
          <div className="bg-muted/40 space-y-3 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">選んだ箇所</p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="閉じる"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            {itemList(selected)}
          </div>
        )}

        {feedback.overallFeedback && (
          <section className="space-y-1.5">
            <p className="text-sm font-semibold">総合評価</p>
            <p className="text-sm leading-relaxed">
              {feedback.overallFeedback}
            </p>
          </section>
        )}

        {(feedback.apMap?.length ?? 0) > 0 ? (
          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <span className={`size-2 rounded-full ${DOT_STYLE.ap}`} />
              APとの対応
            </p>
            <ul className="space-y-2">
              {feedback.apMap!.map((a, i) => {
                const item = model.itemByKey.get(`ap:${i}`);
                const linked = !!item && item.spans.length > 0;
                const style = AP_STATUS[a.status];
                return (
                  <li key={i} className="bg-muted/40 rounded-lg p-3">
                    <button
                      type="button"
                      disabled={!linked}
                      onClick={() => item && focusItem(item)}
                      className="flex w-full items-start gap-2 text-left enabled:cursor-pointer"
                    >
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <span className="text-sm leading-snug font-medium">
                        {a.element}
                      </span>
                    </button>
                    {a.advice && (
                      <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                        {a.advice}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          feedback.apSpecificNotes && (
            <section className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <span className={`size-2 rounded-full ${DOT_STYLE.ap}`} />
                AP
              </p>
              <p className="text-sm leading-relaxed">
                {feedback.apSpecificNotes}
              </p>
            </section>
          )
        )}

        {model.unanchored.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-semibold">全体への指摘</p>
            {itemList(model.unanchored.map((i) => i.key))}
          </section>
        )}
      </div>

      <Sheet
        open={!!selected && !isWide}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        {/* スマホの「AIコーチ」のつまみ（z-60）より上に出す */}
        <SheetContent side="bottom" className="z-[61] max-h-[80vh] xl:hidden">
          <SheetHeader className="pb-0">
            <SheetTitle>この箇所への指摘</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {selected && itemList(selected)}
          </div>
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
  groupOf: (key: string) => DocumentFeedbackGroup | undefined;
  active: boolean;
  onSelect: (keys: string[]) => void;
}) {
  if (segment.keys.length === 0) return <span>{text}</span>;
  const groups = new Set(segment.keys.map(groupOf));
  const top = MARK_PRIORITY.find((g) => groups.has(g)) ?? "content";
  // button 要素だと印ごとに塊で折り返すので、文の流れのまま折り返す span にする
  return (
    <span
      role="button"
      tabIndex={0}
      data-mark-keys={segment.keys.join(" ")}
      onClick={() => onSelect(segment.keys)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(segment.keys);
        }
      }}
      className={[
        "cursor-pointer rounded-sm underline decoration-wavy decoration-2 underline-offset-4 transition-colors",
        MARK_STYLE[top],
        active ? "bg-amber-100 dark:bg-amber-900/40" : "hover:bg-muted",
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function GroupedItems({
  keys,
  model,
  feedback,
  currentContent,
  onApply,
}: {
  keys: string[];
  model: ReturnType<typeof buildDocumentFeedbackModel>;
  feedback: DocumentFeedback;
  currentContent: string;
  onApply: (nextContent: string) => void;
}) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const inGroup = keys
          .map((k) => model.itemByKey.get(k))
          .filter((it): it is DocumentFeedbackItem => it?.group === g.id);
        if (inGroup.length === 0) return null;
        return (
          <div key={g.id} className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`size-2 rounded-full ${DOT_STYLE[g.id]}`} />
              {g.label}
            </p>
            {inGroup.map((it) => (
              <ItemCard
                key={it.key}
                item={it}
                feedback={feedback}
                currentContent={currentContent}
                onApply={onApply}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({
  item,
  feedback,
  currentContent,
  onApply,
}: {
  item: DocumentFeedbackItem;
  feedback: DocumentFeedback;
  currentContent: string;
  onApply: (nextContent: string) => void;
}) {
  if (item.kind === "language") {
    const c = feedback.languageCorrections?.[item.index];
    if (!c) return null;
    const applied = applyCorrection(currentContent, c.original, c.suggestion);
    return (
      <div className="bg-background space-y-2 rounded-lg border p-3">
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
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={applied === null}
          onClick={() => applied !== null && onApply(applied)}
        >
          {applied === null ? "本文に無し" : "本文に入れる"}
        </Button>
      </div>
    );
  }
  if (item.kind === "improvement") {
    const d = feedback.improvementDetails?.[item.index];
    if (!d) return null;
    return (
      <div className="bg-background space-y-1.5 rounded-lg border p-3 text-sm">
        {item.spans.length === 0 && (
          <p className="text-muted-foreground text-xs">{d.location}</p>
        )}
        <p className="leading-relaxed">{d.problem}</p>
        <p className="flex gap-2 leading-relaxed">
          <span className="shrink-0 text-amber-500">→</span>
          <span>{d.action}</span>
        </p>
        {d.example && (
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/30">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              書き換え例
            </p>
            <p className="mt-1 leading-relaxed whitespace-pre-wrap">
              {d.example}
            </p>
          </div>
        )}
      </div>
    );
  }
  const a = feedback.apMap?.[item.index];
  if (!a) return null;
  const style = AP_STATUS[a.status];
  return (
    <div className="bg-background space-y-1.5 rounded-lg border p-3 text-sm">
      <p className="flex items-start gap-2">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
        >
          {style.label}
        </span>
        <span className="font-medium">{a.element}</span>
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        AP「{a.apQuote}」
      </p>
      {a.advice && <p className="leading-relaxed">{a.advice}</p>}
    </div>
  );
}
