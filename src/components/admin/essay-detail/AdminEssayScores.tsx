"use client";

import { Progress } from "@/components/ui/progress";
import { SkillRadarChart } from "@/components/skill-check/SkillRadarChart";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import { buildNextStepHint, headroomAxisLabel } from "@/lib/essay/next-step";
import { essayAxisChanges } from "@/lib/essay/score-axes";
import type { EssayScores } from "@/lib/types/essay";

/**
 * 満点は答案ごとに違う（口頭試問型は専門知識を合計に入れるので60）。
 * 40/30 の絶対値で色を決めると、口頭試問型だけ甘く出る。割合で見る。
 */
export function scoreColor(total: number, max = 50): string {
  const pct = max > 0 ? (total / max) * 100 : 0;
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export interface PreviousScores {
  scores: EssayScores;
  /** 見出しに出す「前回」の中身（書き直しなら「1回目」、それ以外は提出日） */
  label: string;
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="w-12" />;
  const rounded = Math.round(delta * 10) / 10;
  const cls =
    rounded > 0
      ? "font-bold text-blue-700 dark:text-blue-400"
      : rounded < 0
        ? "font-bold text-orange-700 dark:text-orange-400"
        : "text-muted-foreground";
  const text = rounded > 0 ? `+${rounded}` : rounded < 0 ? `−${-rounded}` : "±0";
  return (
    <span className={`w-12 text-right text-xs tabular-nums ${cls}`}>
      {text}
    </span>
  );
}

/**
 * 管理者の答案詳細の点数欄。レーダー・軸ごとの点・前回との差・合計・次の一手。
 * 軸の並び・配点・旧データの扱いは生徒の結果画面と同じ正本（score-axes）を通す。
 */
export function AdminEssayScores({
  scores,
  scoreMaximum,
  apAlignmentAssessable,
  previous,
}: {
  scores: EssayScores;
  scoreMaximum: number;
  apAlignmentAssessable: boolean;
  previous: PreviousScores | null;
}) {
  const rows = essayAxisChanges(scores, previous?.scores).filter(
    (r) => r.key !== "knowledgeAccuracy"
  );
  const hasPrev = !!previous;
  const totalDelta = previous ? scores.total - previous.scores.total : null;
  const next = buildNextStepHint(scores, scoreMaximum);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">AIスコア</h3>
        {previous && (
          <span className="text-muted-foreground text-xs">
            {previous.label}との差
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
        {/* APは合計に入らないので軸に混ぜない。数値は下の一覧に残す */}
        <SkillRadarChart scores={scores} height={220} />
        <div className="grid gap-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="text-muted-foreground w-24 text-xs">
                {r.label}
              </span>
              <div className="flex-1">
                <Progress value={r.value * 10} className="h-2" />
              </div>
              <span className="w-12 text-right text-xs font-medium tabular-nums">
                {r.after.toFixed(1)}/{r.weight}
              </span>
              {hasPrev && <DeltaCell delta={r.delta} />}
            </div>
          ))}
          {/* 口頭試問型の専門知識。合計に入る（満点60） */}
          {typeof scores.knowledgeAccuracy === "number" && (
            <div className="flex items-center gap-3 border-t pt-2">
              <span className="text-muted-foreground w-24 text-xs">
                専門知識の正確性
              </span>
              <div className="flex-1">
                <Progress
                  value={scores.knowledgeAccuracy * 10}
                  className="h-2"
                />
              </div>
              <span className="w-12 text-right text-xs font-medium tabular-nums">
                {scores.knowledgeAccuracy}/10
              </span>
              {hasPrev && (
                <DeltaCell
                  delta={
                    typeof previous?.scores.knowledgeAccuracy === "number"
                      ? scores.knowledgeAccuracy -
                        previous.scores.knowledgeAccuracy
                      : null
                  }
                />
              )}
            </div>
          )}
          {/* 合計外の参考値。レーダーには含めない */}
          {apAlignmentAssessable && typeof scores.apAlignment === "number" && (
            <div className="flex items-center gap-3 border-t pt-2">
              <span className="text-muted-foreground w-24 text-xs">
                AP合致度
                <span className="text-muted-foreground/70 ml-1 text-[10px]">
                  合計外
                </span>
              </span>
              <div className="flex-1">
                <Progress value={scores.apAlignment * 10} className="h-2" />
              </div>
              <span className="text-muted-foreground w-12 text-right text-xs font-medium tabular-nums">
                {scores.apAlignment}/10
              </span>
              {hasPrev && <span className="w-12" />}
            </div>
          )}
          <div className="mt-1 flex items-center gap-3 border-t pt-2">
            <span className="w-20 text-xs font-semibold">合計</span>
            <div className="flex-1" />
            {/* 添削履歴の一覧と同じランク表記。点だけだと水準を掴みにくい */}
            <SkillRankBadge
              rank={scoreToSkillRank(scores.total, scoreMaximum)}
              size="sm"
              animate={false}
            />
            {previous && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {previous.scores.total} →
              </span>
            )}
            <span
              className={`text-lg font-bold ${scoreColor(scores.total, scoreMaximum)}`}
            >
              {scores.total}/{scoreMaximum}
            </span>
            {hasPrev && <DeltaCell delta={totalDelta} />}
          </div>

          {/* 面談で「次はここを狙おう」と言えるようにする。生徒画面と同じ計算を使う */}
          {next && (
            <p className="bg-muted/60 mt-2 rounded-lg px-3 py-2 text-xs">
              あと
              <span className="mx-1 font-bold tabular-nums">
                {next.gap.needed}
              </span>
              点で {next.gap.nextRank} ランク・伸びしろは
              <span className="mx-1 font-semibold">
                {headroomAxisLabel(next.headroom.axis)}
              </span>
              （満点なら +{next.headroom.gain}点）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
