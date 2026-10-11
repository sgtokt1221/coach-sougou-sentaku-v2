"use client";

import { MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";
import { pickDisplayIssues } from "@/lib/essay/display-issues";
import { useAnchoredFeedback } from "@/components/essay/AnchoredFeedbackView";
import type {
  EssayFeedback,
  FeedbackAnchors,
  OralExamQuestionSet,
} from "@/lib/types/essay";

/** 「直すところ」に出す繰り返しの弱点の上限 */
const ISSUES_MAX = 4;

/** 本文に結び付かなかったときだけ、ここに出す指摘の種類と見出し */
const UNANCHORED_LABEL: Record<string, string> = {
  claim: "事実の確認",
  requirement: "設問の要求",
  knowledge: "知識の誤り",
};

/**
 * 結果画面の講評。全体講評・良かったところ・直すところを1か所にまとめる。
 *
 * 以前は上に「良かったところ／直すところ」の要約、答案の右に「全体講評」と
 * 「答案全体への指摘」があり、同じ指摘が2か所に別の書き方で並んでいた。
 * ここに全部まとめ、答案の右の列には出さない（AnchoredFeedbackView の hideGlobal）。
 * 文の直し（赤ペン）は本文の印で読むので、ここでは件数だけ出す。
 */
export function EssayFeedbackOverview({
  text,
  feedback,
  anchors,
  oralExam,
}: {
  text: string;
  feedback: Partial<EssayFeedback>;
  anchors: FeedbackAnchors | null;
  oralExam?: OralExamQuestionSet | null;
}) {
  const model = useAnchoredFeedback({ text, feedback, anchors, oralExam });

  // 最優先の改善点が改善点1件目を指しているとき（priorityTarget = "improvement"）は、
  // 「次にやること」と同じ指摘を2回読ませないよう1件目を落とす。赤ペンを指している
  // ときと、priorityTarget を持たない旧データは全件出す
  const improvements =
    feedback.priorityImprovement && feedback.priorityTarget === "improvement"
      ? (feedback.improvements ?? []).slice(1)
      : (feedback.improvements ?? []);

  const fixItems: { text: string; note?: string; label?: string }[] = [
    ...pickDisplayIssues(feedback.repeatedIssues ?? [], ISSUES_MAX).map(
      (r) => ({ text: r.area, note: r.derived ? undefined : `${r.count}回目` })
    ),
    ...improvements.map((t) => ({ text: t })),
  ];
  if (
    feedback.taskFulfillment &&
    !feedback.taskFulfillment.answersQuestion &&
    feedback.taskFulfillment.note
  ) {
    fixItems.push({
      text: feedback.taskFulfillment.note,
      label: "設問への答え",
    });
  }
  for (const a of model.unanchored) {
    const item = model.itemByKey.get(a.key);
    if (!item || !UNANCHORED_LABEL[item.kind]) continue;
    // 満たしている設問の要求は直すところではない
    if (item.kind === "requirement") {
      const r =
        feedback.taskFulfillment?.requirements?.[Number(a.key.split(":")[1])];
      if (r?.status === "met") continue;
    }
    fixItems.push({ text: item.text, label: UNANCHORED_LABEL[item.kind] });
  }
  const correctionCount = (feedback.languageCorrections ?? []).length;
  if (correctionCount > 0) {
    fixItems.push({
      text: `文の直しが${correctionCount}件`,
    });
  }

  const goodPoints = feedback.goodPoints ?? [];

  return (
    <div className="space-y-5">
      {feedback.overall && (
        <section className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4 text-sky-600" />
            全体講評
          </p>
          <p className="text-base leading-8">{feedback.overall}</p>
        </section>
      )}

      {(goodPoints.length > 0 || fixItems.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Column
            icon={<ThumbsUp className="size-4 text-emerald-600" />}
            title="良かったところ"
            className="bg-emerald-50 dark:bg-emerald-950/30"
            items={goodPoints.map((t) => ({ text: t }))}
          />
          <Column
            icon={<AlertTriangle className="size-4 text-amber-600" />}
            title="直すところ"
            className="bg-amber-50 dark:bg-amber-950/30"
            items={fixItems}
          />
        </div>
      )}
    </div>
  );
}

function Column({
  icon,
  title,
  className,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  className: string;
  items: { text: string; note?: string; label?: string }[];
}) {
  return (
    <section className={`space-y-3 rounded-xl p-5 ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-[15px]">—</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
              <span className="text-muted-foreground shrink-0">・</span>
              <span>
                {item.label && (
                  <span className="text-muted-foreground mr-1.5 text-xs font-semibold">
                    {item.label}
                  </span>
                )}
                {item.text}
                {item.note && (
                  <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {item.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
