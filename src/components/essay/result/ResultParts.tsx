"use client";

import { type ReactNode } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
}

/**
 * 結果画面の先頭。ランクバッジ・点・レーダー・次のランクまで。
 * ランクとレーダーがあることで「採点された」と一目で分かるので、どのタイプでも先頭に置く。
 * バッジがばねで現れ、点が数え上がり、レーダーが中心から広がる順に出す。
 */
export function ResultHero({
  rank,
  total,
  max,
  axes,
  next,
  chips,
  oral,
  footnote,
}: {
  rank: ScoreRank;
  total: number;
  max: number;
  axes: RadarAxis[];
  /** 「Bまであと7点」と伸びしろの軸 */
  next: { rank: string; needed: number; headroom: string } | null;
  /** タイプごとの札（課題文の扱い・重大な知識の誤りなど） */
  chips: { label: string; tone: "good" | "warn" | "bad" }[];
  /** 口頭試問型の問ごとの判定 */
  oral?: {
    no: number;
    prompt: string;
    verdict: keyof typeof VERDICT_STYLE;
  }[];
  /** AP合致度など、合計に入らない参考の1行 */
  footnote?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="bg-card grid gap-3 rounded-2xl p-5 shadow-sm">
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
              <p className="text-muted-foreground text-sm">
                伸びしろ：{next.headroom}
              </p>
            </Reveal>
          )}
        </div>
      </div>

      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={axes} outerRadius="72%">
            <PolarGrid gridType="polygon" stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="short"
              // 頂点に軸名と点（0-10）を並べる
              tick={(raw) => {
                const p = raw as unknown as {
                  x: number;
                  y: number;
                  textAnchor: "start" | "middle" | "end";
                  payload: { value: string; index: number };
                };
                return (
                  <text
                    x={p.x}
                    y={p.y}
                    textAnchor={p.textAnchor}
                    dominantBaseline="central"
                    className="fill-slate-700 text-[13px] dark:fill-slate-200"
                  >
                    {p.payload.value}
                    <tspan
                      dx={4}
                      className="fill-slate-400 font-semibold tabular-nums"
                    >
                      {axes[p.payload.index]?.value}
                    </tspan>
                  </text>
                );
              }}
            />
            <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
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

      {(chips.length > 0 || footnote) && (
        <Reveal delay={1.1} y={6} className="flex flex-wrap items-center gap-2">
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
          {footnote}
        </Reveal>
      )}

      {oral && oral.length > 0 && (
        <div className="grid gap-1.5">
          {oral.map((q, i) => {
            const style = VERDICT_STYLE[q.verdict];
            return (
              <Reveal
                key={q.no}
                delay={1.15 + i * 0.08}
                y={6}
                className="bg-muted/50 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-sm"
              >
                <span className="text-primary font-bold">問{q.no}</span>
                <span className="line-clamp-1">{q.prompt}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
                >
                  {style.label}
                </span>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 今回の課題。1つだけ、答案のどの文に出ているかを引いて見せる。
 * 引用は答案の印の範囲から取る（AIの文面を答案に見せかけて作らない）。
 */
export function FocusCard({
  focus,
  text,
  feedback,
  anchors,
  oralExam,
}: {
  focus: EssayFocus;
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
}) {
  const model = useAnchoredFeedback({ text, feedback, anchors, oralExam });
  const fixes = useFixItems({ focus, text, feedback, anchors, oralExam });
  const quotes: string[] = [];
  for (const m of model.marked) {
    if (!focus.keys.includes(m.key)) continue;
    for (const s of m.spans) {
      const q = text.slice(s.start, s.end).trim();
      if (q && !quotes.includes(q) && quotes.length < 2) quotes.push(q);
    }
  }
  return (
    <div className="grid gap-2 rounded-2xl bg-amber-50 p-5 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
          今回の課題
        </p>
        {fixes.length > 0 && (
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="flex min-h-9 items-center gap-1 rounded-full bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700"
                >
                  詳細
                  <span className="rounded-full bg-white/25 px-1.5 tabular-nums">
                    {fixes.length}
                  </span>
                </button>
              }
            />
            <DialogContent className="gap-3 bg-rose-50 sm:max-w-lg dark:bg-rose-950">
              <DialogHeader>
                <DialogTitle className="text-rose-800 dark:text-rose-200">
                  直すこと
                </DialogTitle>
              </DialogHeader>
              <FixList items={fixes} />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <p className="text-base leading-relaxed whitespace-pre-line">{focus.text}</p>
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

type FixItem = { label?: string; text: string };

/**
 * 今回の課題の内訳（直すこと）。改善点と、本文に印を付けられなかった指摘。
 * 文の直し（赤ペン）は答案の印で読むのでここには出さない。
 */
function useFixItems({
  focus,
  text,
  feedback,
  anchors,
  oralExam,
}: {
  focus: EssayFocus | null;
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
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
  return items;
}

function FixList({ items }: { items: FixItem[] }) {
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
    <div className="bg-card grid gap-2 rounded-2xl p-5">
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
