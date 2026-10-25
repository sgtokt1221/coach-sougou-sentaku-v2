"use client";

import { useReducedMotion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { RankBadge } from "@/components/shared/RankBadge";
import { CountUp, PopIn, Reveal } from "@/components/motion/Reveal";
import { VERDICT_STYLE } from "@/components/essay/OralExamQuestionsCard";
import { useAnchoredFeedback } from "@/components/essay/AnchoredFeedbackView";
import type { ScoreRank } from "@/lib/score-rank";
import { useAuthSWR } from "@/lib/api/swr";
import { essayIssueEntry } from "@/lib/growth/weakness-taxonomy";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { EssayFocus } from "@/lib/essay/result-focus";
import type {
  EssayFeedback,
  FeedbackAnchors,
  OralExamQuestionSet,
  PreviousFocusCheck,
} from "@/lib/types/essay";

export interface RadarAxis {
  short: string;
  value: number;
  /** 前回の点（0-10）。あれば点線で重ねる */
  previous?: number | null;
  /** 伸びしろの軸（満点との差が一番大きい）。ラベルを黄色の太字にする */
  highlight?: boolean;
  /** 前回から上がった・下がった軸 */
  trend?: "up" | "down" | null;
}

/**
 * 結果画面の先頭。ランク・点・次のランクまで・チャート。
 * チャートは最初の画面に必ず置く（2026-10-25。形で強い軸・弱い軸が一目で分かる）。
 * 書き直しは前回の合計と、前回の形を点線で重ねる。
 * スマホは点の下、PC は右にチャートを出す。
 */
export function ResultHero({
  rank,
  total,
  max,
  axes,
  next,
  chips,
  change,
}: {
  rank: ScoreRank;
  total: number;
  max: number;
  axes: RadarAxis[];
  /** 「Bまであと7点」 */
  next: { rank: string; needed: number } | null;
  /** タイプごとの札（課題文の扱い・重大な知識の誤りなど） */
  chips: { label: string; tone: "good" | "warn" | "bad" }[];
  /** 書き直しの前回と今回の合計 */
  change?: { before: number; after: number } | null;
}) {
  const delta = change
    ? Math.round((change.after - change.before) * 10) / 10
    : 0;
  return (
    <div className="bg-card grid gap-3 rounded-2xl p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-6 lg:px-8">
      <div className="grid gap-3">
        <div className="flex items-center gap-5">
          <PopIn delay={0.05}>
            <RankBadge rank={rank} size="md" />
          </PopIn>
          <div className="grid gap-1">
            <p className="font-bold text-slate-900 tabular-nums dark:text-slate-50">
              <CountUp value={total} delay={0.2} className="text-4xl" />
              <span className="text-muted-foreground ml-1 text-lg font-medium">
                / {max}
              </span>
            </p>
            {next && (
              <Reveal delay={0.9} y={6}>
                <p className="text-sm">
                  {next.rank}まであと
                  <span className="text-primary mx-1 text-lg font-bold tabular-nums">
                    {next.needed}
                  </span>
                  点
                </p>
              </Reveal>
            )}
          </div>
        </div>

        {change && (
          <div className="bg-muted/60 flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm lg:justify-start">
            <span>
              前回 <span className="tabular-nums">{change.before}</span> → 今回{" "}
              <span className="tabular-nums">{change.after}</span>
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                delta > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : delta < 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {delta > 0 ? `+${delta}` : delta < 0 ? delta : "±0"}
            </span>
          </div>
        )}

        {chips.length > 0 && (
          <Reveal
            delay={1.1}
            y={6}
            className="flex flex-wrap items-center gap-2"
          >
            {chips.map((c) => (
              <span
                key={c.label}
                className={`rounded-full px-3 py-0.5 text-sm font-semibold ${
                  c.tone === "good"
                    ? "bg-emerald-100 text-emerald-800"
                    : c.tone === "warn"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-rose-100 text-rose-800"
                }`}
              >
                {c.label}
              </span>
            ))}
          </Reveal>
        )}
      </div>

      <div className="grid gap-1">
        <AxisRadar axes={axes} />
        {axes.some((a) => typeof a.previous === "number") && (
          <div className="text-muted-foreground flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-slate-400" />
              前回
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-sky-500/50" />
              今回
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 軸ごとの点のレーダー。頂点に軸名と点（0-10）を並べる */
export function AxisRadar({ axes }: { axes: RadarAxis[] }) {
  const reduce = useReducedMotion();
  const hasPrevious = axes.some((a) => typeof a.previous === "number");
  return (
    <div className="h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={axes} outerRadius="72%">
          <PolarGrid gridType="polygon" stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="short"
            // 頂点に軸名と点（0-10）を並べる。伸びしろの軸は黄、上下した軸は矢印
            tick={(raw) => {
              const p = raw as unknown as {
                x: number;
                y: number;
                textAnchor: "start" | "middle" | "end";
                payload: { value: string; index: number };
              };
              const axis = axes[p.payload.index];
              const tone =
                axis?.trend === "up"
                  ? "fill-emerald-700 font-bold"
                  : axis?.trend === "down"
                    ? "fill-rose-700 font-bold"
                    : axis?.highlight
                      ? "fill-amber-700 font-bold"
                      : "fill-slate-700 dark:fill-slate-200";
              const arrow =
                axis?.trend === "up" ? "↑" : axis?.trend === "down" ? "↓" : "";
              return (
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor={p.textAnchor}
                  dominantBaseline="central"
                  className={`text-[13px] ${tone}`}
                >
                  {p.payload.value}
                  {arrow}
                  <tspan
                    dx={4}
                    className="fill-slate-400 font-semibold tabular-nums"
                  >
                    {axis?.value}
                  </tspan>
                </text>
              );
            }}
          />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {hasPrevious && (
            <Radar
              dataKey="previous"
              stroke="#94a3b8"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              fill="none"
              fillOpacity={0}
              isAnimationActive={false}
            />
          )}
          <Radar
            dataKey="value"
            stroke="#2563eb"
            fill="#0ea5e9"
            fillOpacity={0.22}
            strokeWidth={2}
            dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
            isAnimationActive={!reduce}
            animationBegin={350}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 口頭試問型の問ごとの判定。どの問が弱いかをダイジェストで見せる */
export function OralVerdictCard({
  items,
}: {
  items: {
    no: number;
    prompt: string;
    verdict: keyof typeof VERDICT_STYLE;
    comment?: string;
  }[];
}) {
  return (
    <div className="bg-card grid content-start gap-2 rounded-2xl p-5">
      <p className="text-sm font-bold">問ごとの判定</p>
      {items.map((q) => {
        const style = VERDICT_STYLE[q.verdict];
        return (
          <div
            key={q.no}
            className="bg-muted/50 grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 rounded-xl px-3 py-2.5"
          >
            <p className="text-muted-foreground line-clamp-2 text-xs">
              <span className="text-primary mr-1.5 font-bold">問{q.no}</span>
              {q.prompt}
            </p>
            <span
              className={`row-span-2 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style.className}`}
            >
              {style.label}
            </span>
            {q.comment && (
              <p className="text-sm leading-relaxed">{q.comment}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 次に直すこと。1つだけ、答案のどの文に出ているかを引いて見せる。
 * 引用は答案の印の範囲から取る（AIの文面を答案に見せかけて作らない）。
 */
/** 次に直すこと（本文の印を持たない結果用。面接など） */
export function NextFixCard({ text }: { text: string }) {
  return (
    <div className="grid content-start gap-2 rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30">
      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
        次に直すこと
      </p>
      <p className="text-base leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

/** 良かった所。答案でいちばん伸ばしがいのある一文（goodPoints の1件目） */
export function StrengthCard({ text }: { text: string }) {
  return (
    <div className="grid content-start gap-2 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
        良かった所
      </p>
      <p className="text-base leading-relaxed">{text}</p>
    </div>
  );
}

export function FocusCard({
  focus,
  text,
  feedback,
  anchors,
  oralExam,
  title = "次に直すこと",
}: {
  title?: string;
  focus: EssayFocus;
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
}) {
  const model = useAnchoredFeedback({ text, feedback, anchors, oralExam });
  const quotes: string[] = [];
  for (const m of model.marked) {
    if (!focus.keys.includes(m.key)) continue;
    for (const s of m.spans) {
      const q = text.slice(s.start, s.end).trim();
      if (q && !quotes.includes(q) && quotes.length < 2) quotes.push(q);
    }
  }
  return (
    <div className="grid content-start gap-2 rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30">
      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
        {title}
      </p>
      <p className="text-base leading-relaxed whitespace-pre-line">
        {focus.text}
      </p>
      {quotes.map((q) => (
        <p
          key={q}
          className="bg-card rounded-xl px-3 py-2 text-sm leading-relaxed"
        >
          <span className="underline decoration-amber-500 decoration-wavy decoration-2 underline-offset-[5px]">
            {q}
          </span>
        </p>
      ))}
    </div>
  );
}

/** 次回からの注意点に出す弱点の数 */
const NEXT_TIME_MAX = 2;

/**
 * 次回からの注意点。この答案で見つかった弱点を、どの設問でも使える書き方にして出す。
 * 回数は弱点DBの記録（提出のたびに積まれる）から引く。
 */
export function NextTimeCard({
  issues,
}: {
  issues: { area: string; category?: string | null }[] | undefined;
}) {
  const { data } = useAuthSWR<{ weaknesses: WeaknessRecord[] }>(
    "/api/growth/weaknesses?context=all"
  );
  const seen = new Set<string>();
  const items = (issues ?? []).flatMap((issue) => {
    const entry = essayIssueEntry(issue);
    if (!entry?.nextTime || seen.has(entry.id)) return [];
    seen.add(entry.id);
    const record = data?.weaknesses.find(
      (w) => w.canonicalId === entry.id || w.area === entry.label
    );
    return [{ entry, count: record?.count ?? 0 }];
  });
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 rounded-2xl bg-sky-50 p-5 dark:bg-sky-950/30">
      <p className="text-sm font-bold text-sky-800 dark:text-sky-300">
        次回からの注意点
      </p>
      {items.slice(0, NEXT_TIME_MAX).map(({ entry, count }) => (
        <div key={entry.id} className="grid gap-0.5">
          <p className="text-sm font-semibold">
            {entry.label}
            {count >= 2 && (
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                これまで{count}回
              </span>
            )}
          </p>
          <p className="text-[15px] leading-relaxed">{entry.nextTime}</p>
        </div>
      ))}
    </div>
  );
}

/** 本文に結び付かなかったときだけ、ここに出す指摘の種類と見出し */
const UNANCHORED_LABEL: Record<string, string> = {
  claim: "資料との食い違い",
  requirement: "設問の要求",
  knowledge: "知識の誤り",
};

export type FixItem = {
  label?: string;
  text: string;
  /** 答案の文（読みにくい文・誤字）。直し案は出さない */
  quote?: string;
};

/** 赤ペンのうち「直すこと」に出すもの。言い回しの好み（expression 等）は出さない */
const CORRECTION_LABEL: Partial<Record<string, string>> = {
  grammar: "読みにくい文",
  typo: "誤字",
};

/**
 * 直すこと。改善点・本文に印を付けられなかった指摘と、崩れた文・誤字。
 * 赤ペン（消し線と書き換え）は分かりにくいので出さず、崩れた文は答案の文と理由だけ出す
 * （2026-10-25。表現の点を下げた理由が画面から消えないように残す）。
 * feedback は画面用（赤ペンを外したもの）、corrections は保存されている赤ペン。
 */
export function useFixItems({
  focus,
  text,
  feedback,
  anchors,
  oralExam,
  corrections = [],
}: {
  focus: EssayFocus | null;
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
  corrections?: { original: string; type: string; reason: string }[];
}): FixItem[] {
  const model = useAnchoredFeedback({ text, feedback, anchors, oralExam });
  const skip = new Set(focus?.keys ?? []);
  const items: FixItem[] = [];
  (feedback.improvements ?? []).forEach((t, i) => {
    if (!skip.has(`improvement:${i}`)) items.push({ text: t });
  });
  const tf = feedback.taskFulfillment;
  if (tf && !tf.answersQuestion && tf.note) {
    items.push({ label: "設問への答え", text: tf.note });
  }
  for (const a of model.unanchored) {
    const item = model.itemByKey.get(a.key);
    if (!item || !UNANCHORED_LABEL[item.kind] || skip.has(a.key)) continue;
    if (item.kind === "requirement") {
      const r = tf?.requirements?.[Number(a.key.split(":")[1])];
      if (r?.status === "met") continue;
    }
    items.push({ label: UNANCHORED_LABEL[item.kind], text: item.text });
  }
  for (const c of corrections) {
    const label = CORRECTION_LABEL[c.type];
    if (label) items.push({ label, text: c.reason, quote: c.original });
  }
  return items;
}

export function FixList({ items }: { items: FixItem[] }) {
  return (
    <ol className="grid gap-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="bg-card flex gap-3 rounded-xl px-3 py-2.5 text-[15px] leading-relaxed"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0">
            {item.label && (
              <span className="mr-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
                {item.label}
              </span>
            )}
            {item.quote && (
              <span className="bg-muted/60 my-1 block rounded-lg px-2.5 py-1.5 text-sm">
                {item.quote}
              </span>
            )}
            {item.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

const PREVIOUS_STATUS: Record<
  PreviousFocusCheck["status"],
  { label: string; className: string }
> = {
  resolved: {
    label: "直った",
    className: "bg-emerald-100 text-emerald-800",
  },
  partial: { label: "一部だけ", className: "bg-amber-100 text-amber-900" },
  unresolved: { label: "まだ", className: "bg-rose-100 text-rose-800" },
};

/** 書き直しのとき、前回の課題が直ったか */
export function PreviousFocusCard({ check }: { check: PreviousFocusCheck }) {
  const status = PREVIOUS_STATUS[check.status];
  return (
    <div className="bg-card grid content-start gap-2 rounded-2xl p-5">
      <p className="flex items-center gap-2 text-sm font-bold">
        前回の課題
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${status.className}`}
        >
          {status.label}
        </span>
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {check.focus}
      </p>
      <p className="text-[15px] leading-relaxed">{check.comment}</p>
      {check.evidence && (
        <p className="bg-muted/50 rounded-xl px-3 py-2 text-sm leading-relaxed">
          {check.evidence}
        </p>
      )}
    </div>
  );
}
