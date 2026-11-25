"use client";

import { Button } from "@/components/ui/button";
import { ResultHero, type RadarAxis } from "@/components/essay/result/ResultParts";
import { charDiff } from "@/lib/text/char-diff";
import { applyCorrection } from "@/lib/documents/feedback-anchors";
import { axisPoints, getRankFromPercentage } from "@/lib/score-rank";
import { nextRankGap } from "@/lib/essay/next-step";
import {
  documentScoreLayout,
  documentTotal,
  type DocumentAxisScore,
} from "@/lib/documents/score-axes";
import type {
  DocumentFeedback,
  DocumentProgressItem,
} from "@/lib/types/document";

/**
 * 書類の添削結果のダイジェスト（2026-11-26）。小論文の結果画面と同じ「ダイジェスト → 詳細」の
 * 先頭に置く: ①今どこ（ランク・点・次のランクまで・チャート） ②前回の課題 ③今回の課題と直し方。
 * 生徒の編集画面の「添削を見る」だけで出す（管理者の詳細は狭い列なので前の形のまま）。
 */

const PROGRESS_STATUS: Record<
  DocumentProgressItem["status"],
  { label: string; className: string }
> = {
  resolved: {
    label: "直った",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  improved: {
    label: "良くなった",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  },
  unchanged: {
    label: "まだ",
    className:
      "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  },
};
const PROGRESS_ORDER: DocumentProgressItem["status"][] = [
  "unchanged",
  "improved",
  "resolved",
];

/** 配点で重み付けして、満点との差が一番大きい軸（伸びしろ） */
export function headroomAxisKey(axes: DocumentAxisScore[]): string | null {
  let best: { key: string; gap: number } | null = null;
  for (const a of axes) {
    if (a.score === null) continue;
    const gap = a.weight - axisPoints(a.score, a.weight);
    if (!best || gap > best.gap) best = { key: a.key, gap };
  }
  return best?.key ?? null;
}

export function DocumentReviewDigest({
  documentType,
  feedback,
  currentContent,
  onApply,
}: {
  documentType?: string;
  feedback: DocumentFeedback;
  currentContent: string;
  onApply?: (nextContent: string) => void;
}) {
  const layout = documentScoreLayout(feedback, documentType);
  const current = documentTotal(layout);
  const progress = feedback.progress;
  const previous = progress?.previousTotal ?? null;
  const comparable =
    !!previous &&
    !layout.incomplete &&
    previous.version === layout.version &&
    previous.max === current.max;
  const headroom = headroomAxisKey(layout.axes);
  const axes: RadarAxis[] = layout.axes
    .filter((a) => a.score !== null)
    .map((a) => {
      const prev = comparable ? (previous?.axes?.[a.key] ?? null) : null;
      return {
        // チャートの頂点に収まるよう、末尾の「の質」を外す（経験と思考の質 → 経験と思考）
        short: a.label.replace(/の質$/, ""),
        value: a.score as number,
        previous: prev,
        highlight: a.key === headroom,
        trend:
          typeof prev === "number" && prev !== a.score
            ? (a.score as number) > prev
              ? "up"
              : "down"
            : null,
      };
    });
  const gap = nextRankGap(current.total, current.max);

  const chips: { label: string; tone: "good" | "warn" | "bad" }[] = [];
  if (typeof feedback.fillRate === "number") {
    chips.push({
      label: `字数 ${feedback.fillRate}%`,
      tone: feedback.fillRate >= 90 && feedback.fillRate <= 100 ? "good" : "warn",
    });
  }
  const apMap = feedback.apMap ?? [];
  if (apMap.length > 0) {
    const met = apMap.filter((a) => a.status === "met").length;
    chips.push({
      label: `AP ${apMap.length}項目のうち${met}つに応えている`,
      tone: met * 2 >= apMap.length ? "good" : "warn",
    });
  }

  const progressItems = progress
    ? [...progress.items].sort(
        (a, b) =>
          PROGRESS_ORDER.indexOf(a.status) - PROGRESS_ORDER.indexOf(b.status)
      )
    : [];
  const first = feedback.improvementDetails?.[0];
  const firstApplied =
    first?.example && first.location
      ? applyCorrection(currentContent, first.location, first.example)
      : null;
  const priority = feedback.priorityImprovement ?? feedback.overallFeedback;

  return (
    <div className="space-y-4">
      {layout.incomplete ? (
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <p className="text-2xl font-bold">書きかけ</p>
          {typeof feedback.fillRate === "number" && (
            <p className="text-muted-foreground mt-1 text-sm tabular-nums">
              目標字数の{feedback.fillRate}%
            </p>
          )}
        </div>
      ) : (
        current.max > 0 && (
          <ResultHero
            rank={getRankFromPercentage(current.percentage)}
            total={current.total}
            max={current.max}
            axes={axes}
            next={gap ? { rank: gap.nextRank, needed: gap.needed } : null}
            chips={chips}
            radarOuterRadius="56%"
            change={
              comparable
                ? { before: previous!.total, after: current.total }
                : null
            }
          />
        )
      )}

      {(progressItems.length > 0 || priority) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {progressItems.length > 0 && (
            <section className="bg-card space-y-3 rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-bold">前回の課題</h2>
              <ul className="space-y-2">
                {progressItems.map((p, i) => {
                  const style = PROGRESS_STATUS[p.status];
                  return (
                    <li key={i} className="bg-muted/60 rounded-xl p-3">
                      <p className="flex items-start gap-3">
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-sm font-bold ${style.className}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-sm leading-relaxed">
                          {p.label}
                        </span>
                      </p>
                      {p.note && (
                        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                          {p.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {priority && (
            <section
              className={`space-y-3 rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30 ${
                progressItems.length === 0 ? "lg:col-span-2" : ""
              }`}
            >
              <h2 className="text-base font-bold text-amber-800 dark:text-amber-300">
                {feedback.priorityImprovement ? "今回の課題" : "総合評価"}
              </h2>
              <p className="text-[15px] leading-7">{priority}</p>
              {first?.example && (
                <div className="bg-card space-y-2 rounded-xl p-4">
                  <p className="text-sm leading-relaxed">
                    {charDiff(first.location, first.example).map((part, i) =>
                      part.type === "same" ? (
                        <span key={i}>{part.text}</span>
                      ) : part.type === "del" ? (
                        <span
                          key={i}
                          className="text-muted-foreground line-through decoration-rose-500"
                        >
                          {part.text}
                        </span>
                      ) : (
                        <span
                          key={i}
                          className="rounded bg-emerald-100 px-0.5 dark:bg-emerald-950/60"
                        >
                          {part.text}
                        </span>
                      )
                    )}
                  </p>
                  {onApply && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={firstApplied === null}
                        onClick={() =>
                          firstApplied !== null && onApply(firstApplied)
                        }
                      >
                        {firstApplied === null ? "本文に無し" : "本文に入れる"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** 軸ごとの点と、その根拠になった本文の引用 */
export function DocumentAxisEvidence({
  documentType,
  feedback,
}: {
  documentType?: string;
  feedback: DocumentFeedback;
}) {
  const layout = documentScoreLayout(feedback, documentType);
  if (layout.incomplete) return null;
  const headroom = headroomAxisKey(layout.axes);
  const axes = layout.axes.filter((a) => a.score !== null);
  if (axes.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">軸ごとの点</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {axes.map((a) => {
          const quote = feedback.scoreEvidence?.[a.key]?.[0];
          const isHeadroom = a.key === headroom;
          return (
            <div key={a.key} className="bg-card space-y-2 rounded-2xl p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`font-bold ${isHeadroom ? "text-amber-700 dark:text-amber-400" : ""}`}
                >
                  {a.label}
                </span>
                <span className="tabular-nums">
                  <span className="text-lg font-bold">
                    {axisPoints(a.score as number, a.weight).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-sm"> / {a.weight}</span>
                </span>
              </div>
              <div className="bg-muted h-2 rounded-full">
                <div
                  className={`h-2 rounded-full ${isHeadroom ? "bg-amber-400" : "bg-primary"}`}
                  style={{ width: `${(a.score as number) * 10}%` }}
                />
              </div>
              {quote && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  「{quote}」
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
