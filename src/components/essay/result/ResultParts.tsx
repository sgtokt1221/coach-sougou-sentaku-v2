"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
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
  CountUp,
  PopIn,
  Reveal,
  SMOOTH_EASE,
} from "@/components/motion/Reveal";
import { VERDICT_STYLE } from "@/components/essay/OralExamQuestionsCard";
import { useAnchoredFeedback } from "@/components/essay/AnchoredFeedbackView";
import type { ScoreRank } from "@/lib/score-rank";
import type { EssayFocus } from "@/lib/essay/result-focus";
import type {
  EssayFeedback,
  FeedbackAnchors,
  OralExamQuestionSet,
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
      <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
        今回の課題
        {focus.tag && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs dark:bg-amber-900/50">
            {focus.tag}
          </span>
        )}
      </p>
      <p className="text-base leading-relaxed">{focus.text}</p>
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

/** 次も使える書き方。1つだけ */
export function GoodPointCard({ text }: { text: string }) {
  return (
    <div className="grid gap-1.5 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
        次も使える書き方
      </p>
      <p className="text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

export interface MoreRow {
  id: string;
  label: string;
  meta?: string;
  content: ReactNode;
}

/**
 * 畳んだ行。開くと高さが動いて中身が出る。結果を読む場面で要らない情報
 * （全指摘・課題文・書き換え例・テーマ深掘り）はここに置き、必要な人が開く。
 */
export function MoreRows({ rows }: { rows: MoreRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-2">
      {rows.map((r) => {
        const isOpen = open === r.id;
        return (
          <div
            key={r.id}
            id={`${r.id}-section`}
            className="bg-card scroll-mt-20 overflow-hidden rounded-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : r.id)}
              aria-expanded={isOpen}
              className="hover:bg-muted/50 flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors"
            >
              <span className="text-[15px] font-semibold">{r.label}</span>
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                {r.meta}
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: SMOOTH_EASE }}
                  className="inline-flex"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: SMOOTH_EASE }}
                >
                  <div className="px-5 pb-5">{r.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
