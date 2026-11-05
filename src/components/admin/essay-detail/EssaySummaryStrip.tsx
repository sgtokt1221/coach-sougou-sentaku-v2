"use client";

import { PREVIOUS_STATUS } from "@/components/essay/result/ResultParts";
import { pickFocus } from "@/lib/essay/result-focus";
import { weaknessCountOf } from "@/lib/growth/weakness-count";
import type { EssayFeedback } from "@/lib/types/essay";
import type { WeaknessRecord } from "@/lib/types/growth";

/**
 * 答案詳細の一番上の要点。面談で何を言うかを、講評を読む前に決められるようにする。
 * 今回の最優先・前回の課題が直ったか・何度も出ている弱点の3行。
 */
export function EssaySummaryStrip({
  feedback,
  weaknesses,
}: {
  feedback: Partial<EssayFeedback>;
  weaknesses: WeaknessRecord[];
}) {
  const focus = pickFocus(feedback);
  const check = feedback.previousFocusCheck ?? null;
  const status = check ? PREVIOUS_STATUS[check.status] : null;

  const seen = new Set<string>();
  const repeated = (feedback.repeatedIssues ?? []).flatMap((issue) => {
    const hit = weaknessCountOf(issue, weaknesses);
    if (!hit || hit.count < 2 || seen.has(hit.label)) return [];
    seen.add(hit.label);
    return [hit];
  });
  repeated.sort((a, b) => b.count - a.count);

  if (!focus && !check && repeated.length === 0) return null;

  return (
    <div className="bg-muted grid gap-3 rounded-xl p-4">
      {focus && (
        <Row label="今回の最優先">
          <span className="text-sm leading-relaxed font-medium">
            {focus.text}
          </span>
        </Row>
      )}
      {check && status && (
        <Row label="前回の課題">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed">
            {check.focus}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>
            {check.evidence && (
              <span className="text-muted-foreground text-xs">
                {check.evidence}
              </span>
            )}
          </span>
        </Row>
      )}
      {repeated.length > 0 && (
        <Row label="繰り返す弱点">
          <span className="flex flex-wrap gap-1.5">
            {repeated.slice(0, 5).map((r) => (
              <span
                key={r.label}
                className="bg-background rounded-md px-2 py-0.5 text-xs"
              >
                {r.label}
                <b className="ml-1 text-orange-800 dark:text-orange-300">
                  {r.count}回
                </b>
              </span>
            ))}
          </span>
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
      <span className="text-muted-foreground text-xs font-bold">{label}</span>
      {children}
    </div>
  );
}
