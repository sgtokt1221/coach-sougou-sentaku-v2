"use client";

import { useMemo, useState } from "react";
import { FileText, Mic, ChevronUp, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSWR } from "@/lib/api/swr";
import { SegmentControl } from "@/components/shared/SegmentControl";
import {
  AssignHomeworkButton,
  homeworkApiBase,
} from "@/components/admin/AssignHomeworkButton";
import { resolveUsage } from "@/lib/growth/practice-questions-helpers";
import type { PracticeQuestion } from "@/lib/types/growth-report";
import type { HomeworkAssignment } from "@/lib/types/homework";

/**
 * 類題 (practiceQuestions) の表示・編集パネル。
 *
 * レポート / セッションの両方から再利用できるよう、配布元を contextType + contextId
 * で抽象化している。生成 (AI 呼び出し) はこのコンポーネントの責務ではない
 * (セッションでは台本とセット生成、レポートでは別経路)。
 *
 * - editing=false: usage 別タブで一覧表示 (canAssign で宿題配布ボタン)
 * - editing=true: value/onChange の制御コンポーネントとして編集 UI を描画
 */
interface Props {
  questions: PracticeQuestion[];
  studentId: string;
  contextType: "report" | "session";
  /** reportId or sessionId */
  contextId: string;
  /** true なら宿題配布ボタンを表示 (admin/teacher のみ) */
  canAssign?: boolean;
  /** 編集モード (外部=親が制御) */
  editing?: boolean;
  /** 編集中のドラフト (editing=true のとき必須) */
  value?: PracticeQuestion[];
  /** 編集変更ハンドラ */
  onChange?: (qs: PracticeQuestion[]) => void;
}

export function PracticeQuestionsPanel({
  questions,
  studentId,
  contextType,
  contextId,
  canAssign,
  editing,
  value,
  onChange,
}: Props) {
  if (editing) {
    return (
      <PracticeQuestionsEditor value={value ?? []} onChange={onChange ?? (() => {})} />
    );
  }
  if (questions.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        類題はまだありません。台本生成と同時に AI が作成します。
      </p>
    );
  }
  return (
    <PracticeQuestionsList
      questions={questions}
      studentId={studentId}
      contextType={contextType}
      contextId={contextId}
      canAssign={canAssign}
    />
  );
}

/** 編集 UI (制御コンポーネント) */
function PracticeQuestionsEditor({
  value,
  onChange,
}: {
  value: PracticeQuestion[];
  onChange: (qs: PracticeQuestion[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((q, i) => (
        <div key={q.id} className="rounded-md border bg-white p-3 dark:bg-card">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={q.type}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], type: e.target.value as "essay" | "interview" };
                onChange(next);
              }}
              className="rounded border px-2 py-1 text-xs"
            >
              <option value="essay">小論文</option>
              <option value="interview">面接</option>
            </select>
            <select
              value={resolveUsage(q)}
              onChange={(e) => {
                const usage = e.target.value as "lesson" | "homework" | "extra";
                const next = [...value];
                next[i] = {
                  ...next[i],
                  usage,
                  priority: usage === "lesson" ? "primary" : "secondary",
                };
                onChange(next);
              }}
              className="rounded border px-2 py-1 text-xs"
            >
              <option value="lesson">授業中</option>
              <option value="homework">宿題</option>
              <option value="extra">予備</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              disabled={i === 0}
              onClick={() => {
                const next = [...value];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
              aria-label="上に移動"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={i === value.length - 1}
              onClick={() => {
                const next = [...value];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                onChange(next);
              }}
              aria-label="下に移動"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label="この類題を削除"
              className="ml-auto"
            >
              <X className="size-4" />
            </Button>
          </div>
          <Textarea
            value={q.title}
            onChange={(e) => {
              const next = [...value];
              next[i] = { ...next[i], title: e.target.value };
              onChange(next);
            }}
            rows={2}
            placeholder="題目 / 質問文 (短く)"
            className="mt-2 text-sm"
          />
          <Textarea
            value={q.relatedWeakness ?? ""}
            onChange={(e) => {
              const next = [...value];
              next[i] = { ...next[i], relatedWeakness: e.target.value };
              onChange(next);
            }}
            rows={1}
            placeholder="関連弱点 (今週の論理性が X 点だったので、など)"
            className="mt-1 text-xs"
          />
          <Textarea
            value={q.modelAnswer ?? ""}
            onChange={(e) => {
              const next = [...value];
              next[i] = { ...next[i], modelAnswer: e.target.value };
              onChange(next);
            }}
            rows={4}
            placeholder="解答例 (小論文: 400-500 字 / 面接: 80-150 字)"
            className="mt-1 text-xs"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={q.homeworkAssignable !== false}
              onChange={(e) => {
                const next = [...value];
                next[i] = { ...next[i], homeworkAssignable: e.target.checked };
                onChange(next);
              }}
              className="size-3.5"
            />
            <span>
              宿題として配布可
              <span className="ml-1 text-[10px]">
                (短答系など模擬面接 / 小論文として成立しないものは外す)
              </span>
            </span>
          </label>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...value,
            {
              id: `pq_${Date.now()}_${value.length}`,
              type: "essay",
              usage: "lesson",
              priority: "primary",
              title: "",
              relatedWeakness: "",
              order: value.length,
              homeworkAssignable: true,
            },
          ])
        }
      >
        ＋ 類題を追加
      </Button>
    </div>
  );
}

/** usage 別タブの一覧表示 */
function PracticeQuestionsList({
  questions,
  studentId,
  contextType,
  contextId,
  canAssign,
}: {
  questions: PracticeQuestion[];
  studentId: string;
  contextType: "report" | "session";
  contextId: string;
  canAssign?: boolean;
}) {
  const { data: assignments, mutate: mutateAssignments } = useAuthSWR<
    HomeworkAssignment[]
  >(
    canAssign && studentId && contextId
      ? homeworkApiBase(contextType, studentId, contextId)
      : null,
  );
  const assignmentMap = useMemo(() => {
    const map = new Map<string, HomeworkAssignment>();
    for (const a of assignments ?? []) {
      map.set(a.practiceQuestionId, a);
    }
    return map;
  }, [assignments]);

  const grouped = useMemo(() => {
    const out: Record<"lesson" | "homework" | "extra", PracticeQuestion[]> = {
      lesson: [],
      homework: [],
      extra: [],
    };
    for (const q of questions) {
      out[resolveUsage(q)].push(q);
    }
    return out;
  }, [questions]);

  const usageLabel: Record<"lesson" | "homework" | "extra", string> = {
    lesson: "授業中",
    homework: "宿題",
    extra: "予備",
  };

  const renderList = (usage: "lesson" | "homework" | "extra") => {
    const list = grouped[usage];
    if (list.length === 0) {
      return (
        <p className="py-4 text-center text-xs text-muted-foreground">
          このカテゴリーには類題がありません
        </p>
      );
    }
    const variant = usage === "lesson" ? "primary" : "secondary";
    return (
      <div className="space-y-2">
        {list.map((pq) => (
          <PracticeQuestionCard
            key={pq.id}
            pq={pq}
            variant={variant}
            assignmentControl={
              canAssign && studentId && contextId
                ? {
                    studentId,
                    contextType,
                    contextId,
                    existing: assignmentMap.get(pq.id),
                    onMutated: () => mutateAssignments(),
                  }
                : undefined
            }
          />
        ))}
      </div>
    );
  };

  const allByUsage = (["lesson", "homework", "extra"] as const).filter(
    (u) => grouped[u].length > 0,
  );

  const [tab, setTab] = useState<"lesson" | "homework" | "extra" | "all">("lesson");

  return (
    <>
      {/* 画面用: SegmentControl + 条件分岐 (印刷時非表示) */}
      <div className="print:hidden">
        <SegmentControl
          value={tab}
          onChange={setTab}
          options={[
            { id: "lesson", label: "授業中", count: grouped.lesson.length },
            { id: "homework", label: "宿題", count: grouped.homework.length },
            { id: "extra", label: "予備", count: grouped.extra.length },
            { id: "all", label: "すべて", count: questions.length },
          ]}
          size="sm"
          defaultAccent="emerald"
        />
        <div className="mt-3">
          {tab === "lesson" && renderList("lesson")}
          {tab === "homework" && renderList("homework")}
          {tab === "extra" && renderList("extra")}
          {tab === "all" && (
            <div className="space-y-4">
              {allByUsage.map((usage) => (
                <div key={usage}>
                  <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {usageLabel[usage]} ({grouped[usage].length})
                  </h5>
                  {renderList(usage)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 印刷用: タブ枠なしで全件直接表示 (lesson → homework → extra の順) */}
      <div className="hidden print:block">
        <div className="space-y-2">
          {allByUsage.map((usage) => (
            <div key={usage} className="print:break-inside-avoid">
              <h5 className="mb-1 text-[10pt] font-semibold uppercase tracking-wide text-muted-foreground">
                {usageLabel[usage]} ({grouped[usage].length})
              </h5>
              {renderList(usage)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PracticeQuestionCard({
  pq,
  variant,
  assignmentControl,
}: {
  pq: PracticeQuestion;
  variant: "primary" | "secondary";
  assignmentControl?: {
    studentId: string;
    contextType: "report" | "session";
    contextId: string;
    existing?: HomeworkAssignment;
    onMutated?: () => void;
  };
}) {
  const isPrimary = variant === "primary";
  const isEssay = pq.type === "essay";

  return (
    <div
      className={`rounded-lg border p-3 print:break-inside-avoid print:p-2 ${
        isPrimary
          ? isEssay
            ? "border-sky-300 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-800 dark:from-sky-950/40 dark:to-cyan-950/40 print:border-gray-300 print:bg-white print:shadow-none"
            : "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40 print:border-gray-300 print:bg-white print:shadow-none"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {isEssay ? <FileText className="size-3" /> : <Mic className="size-3" />}
        <span>{isEssay ? "小論文" : "面接"}</span>
        {isPrimary ? (
          <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
            授業中
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            宿題
          </Badge>
        )}
        {pq.difficulty && (
          <Badge
            variant="outline"
            className={`text-[10px] ${
              pq.difficulty === "advanced"
                ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                : pq.difficulty === "basic"
                  ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
            }`}
          >
            {pq.difficulty === "basic"
              ? "基礎"
              : pq.difficulty === "advanced"
                ? "応用"
                : "標準"}
          </Badge>
        )}
        {typeof pq.estimatedMinutes === "number" && pq.estimatedMinutes > 0 && (
          <Badge variant="outline" className="text-[10px]">
            目安 {pq.estimatedMinutes} 分
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{pq.title}</p>
      {pq.objective && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">目的:</span> {pq.objective}
        </p>
      )}
      {pq.relatedWeakness && (
        <p className="mt-1 text-[10px] text-muted-foreground">関連: {pq.relatedWeakness}</p>
      )}
      {pq.hints && pq.hints.length > 0 && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            ヒント ({pq.hints.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {pq.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </details>
      )}
      {pq.rubric && pq.rubric.length > 0 && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-sky-700 dark:text-sky-400">
            評価観点 ({pq.rubric.length})
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {pq.rubric.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}
      {pq.teacherNotes && (
        <details className="mt-2 print:hidden">
          <summary className="cursor-pointer text-[10px] font-semibold text-purple-700 dark:text-purple-400">
            講師メモ
          </summary>
          <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
            {pq.teacherNotes}
          </p>
        </details>
      )}
      {pq.modelAnswer &&
        (isPrimary ? (
          <div className="mt-2 rounded bg-white/70 p-2 dark:bg-black/20 print:hidden">
            <div className="mb-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{pq.modelAnswer}</p>
          </div>
        ) : (
          <details className="mt-2 print:hidden">
            <summary className="cursor-pointer text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              解答例を見る
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs leading-relaxed">
              {pq.modelAnswer}
            </p>
          </details>
        ))}
      {assignmentControl && (
        <div className="mt-2 flex justify-end print:hidden">
          <AssignHomeworkButton
            studentId={assignmentControl.studentId}
            contextType={assignmentControl.contextType}
            contextId={assignmentControl.contextId}
            practiceQuestionId={pq.id}
            existing={assignmentControl.existing}
            onMutated={assignmentControl.onMutated}
            assignable={pq.homeworkAssignable !== false}
          />
        </div>
      )}
    </div>
  );
}
