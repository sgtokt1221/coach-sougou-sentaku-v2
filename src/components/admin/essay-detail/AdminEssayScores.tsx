"use client";

import { useState } from "react";
import { Loader2, Minus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SkillRadarChart } from "@/components/skill-check/SkillRadarChart";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import { buildNextStepHint, headroomAxisLabel } from "@/lib/essay/next-step";
import {
  essayAxisChanges,
  essayScoreAxisRows,
  isLegacyEssayScores,
} from "@/lib/essay/score-axes";
import type { EssayScores, TeacherScoreEdit } from "@/lib/types/essay";

export type TeacherScoreInput = Record<string, number>;

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
  teacherEdit,
  onSave,
  onReset,
}: {
  scores: EssayScores;
  scoreMaximum: number;
  apAlignmentAssessable: boolean;
  previous: PreviousScores | null;
  /** 先生が点を直した記録（あれば札と元のAIの点を出す） */
  teacherEdit?: TeacherScoreEdit | null;
  /** 点を直す。渡されなければ編集できない */
  onSave?: (scores: TeacherScoreInput, reason: string) => Promise<void>;
  onReset?: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  // 旧採点（独自性の軸）と満点40の答案は今の計算で合計を出し直せないので直させない
  const canEdit =
    !!onSave &&
    !isLegacyEssayScores(scores) &&
    (scoreMaximum === 50 || scoreMaximum === 60);
  if (editing && onSave) {
    return (
      <ScoreEditor
        scores={scores}
        initialReason={teacherEdit?.reason ?? ""}
        onCancel={() => setEditing(false)}
        onSave={async (input, reason) => {
          await onSave(input, reason);
          setEditing(false);
        }}
      />
    );
  }
  const aiRows = teacherEdit ? essayScoreAxisRows(teacherEdit.aiScores) : [];
  const aiPointsOf = (key: string, weight: number) => {
    const r = aiRows.find((x) => x.key === key);
    return r ? Math.round(r.value * weight) / 10 : null;
  };
  const rows = essayAxisChanges(scores, previous?.scores).filter(
    (r) => r.key !== "knowledgeAccuracy"
  );
  const hasPrev = !!previous;
  const totalDelta = previous ? scores.total - previous.scores.total : null;
  const next = buildNextStepHint(scores, scoreMaximum);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          {teacherEdit ? "スコア" : "AIスコア"}
          {teacherEdit && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900 dark:bg-blue-950/50 dark:text-blue-200">
              {teacherEdit.byName}が修正済み
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {previous && (
            <span className="text-muted-foreground text-xs">
              {previous.label}との差
            </span>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
              点を直す
            </Button>
          )}
        </div>
      </div>
      {teacherEdit && (
        <div className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs">
          <span>
            AIの合計 {teacherEdit.aiScores.total}
            {teacherEdit.reason && ` ・ ${teacherEdit.reason}`}
          </span>
          {onReset && (
            <button
              type="button"
              onClick={() => void onReset()}
              className="font-medium text-blue-700 hover:underline dark:text-blue-400"
            >
              AIの点に戻す
            </button>
          )}
        </div>
      )}
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
              <span className="w-16 text-right text-xs font-medium tabular-nums">
                {(() => {
                  const ai = aiPointsOf(r.key, r.weight);
                  return ai !== null && ai !== r.after ? (
                    <s className="text-muted-foreground mr-1 font-normal">
                      {ai.toFixed(1)}
                    </s>
                  ) : null;
                })()}
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

/** 先生が軸ごとの点（0〜10の整数）を直す欄。合計は保存時にサーバーが出し直す */
function ScoreEditor({
  scores,
  initialReason,
  onCancel,
  onSave,
}: {
  scores: EssayScores;
  initialReason: string;
  onCancel: () => void;
  onSave: (scores: TeacherScoreInput, reason: string) => Promise<void>;
}) {
  const rows = essayScoreAxisRows(scores);
  const [draft, setDraft] = useState<TeacherScoreInput>(() =>
    Object.fromEntries(rows.map((r) => [r.key, Math.round(r.value)]))
  );
  const [reason, setReason] = useState(initialReason);
  const [saving, setSaving] = useState(false);
  const total = Math.round(
    rows.reduce(
      (sum, r) =>
        sum +
        (draft[r.key] ?? r.value) *
          (r.key === "knowledgeAccuracy" ? 1 : r.weight / 10),
      0
    )
  );
  const step = (key: string, d: number) =>
    setDraft((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(10, (prev[key] ?? 0) + d)),
    }));
  return (
    <div className="bg-muted space-y-3 rounded-xl p-4">
      <h3 className="text-sm font-semibold">点を直す</h3>
      <div className="grid gap-2">
        {rows.map((r) => {
          const v = draft[r.key] ?? 0;
          const changed = v !== Math.round(r.value);
          return (
            <div key={r.key} className="flex items-center gap-2">
              <span className="text-muted-foreground w-28 text-xs">
                {r.label}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label={`${r.label}を下げる`}
                onClick={() => step(r.key, -1)}
                disabled={v <= 0}
              >
                <Minus className="size-3.5" />
              </Button>
              <span
                className={`w-8 text-center text-sm font-bold tabular-nums ${changed ? "text-blue-700 dark:text-blue-400" : ""}`}
              >
                {v}
              </span>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                aria-label={`${r.label}を上げる`}
                onClick={() => step(r.key, 1)}
                disabled={v >= 10}
              >
                <Plus className="size-3.5" />
              </Button>
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {r.key === "knowledgeAccuracy"
                  ? `${v}/10`
                  : `${((v * r.weight) / 10).toFixed(1)}/${r.weight}`}
              </span>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between border-t pt-2 text-sm">
          <span className="font-semibold">合計</span>
          <span className="font-bold tabular-nums">
            <s className="text-muted-foreground mr-2 font-normal">
              {scores.total}
            </s>
            {total}
          </span>
        </div>
      </div>
      <label className="grid gap-1">
        <span className="text-muted-foreground text-xs font-bold">直した理由</span>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          やめる
        </Button>
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(draft, reason.trim());
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving && <Loader2 className="size-3.5 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}
