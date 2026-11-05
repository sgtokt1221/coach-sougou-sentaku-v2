import { essayIssueEntry } from "@/lib/growth/weakness-taxonomy";
import type { RepeatedIssue } from "@/lib/types/essay";
import type { WeaknessRecord } from "@/lib/types/growth";

/**
 * 答案の弱点1件を弱点DBの記録と突き合わせ、これまでの回数を返す。
 * 突き合わせ方は生徒の「次回からの注意点」と同じ（正規の項目ID か表示名）。
 * アーカイブ済みの記録（統合元）は数えない。
 */
export function weaknessCountOf(
  issue: Pick<RepeatedIssue, "area" | "category">,
  weaknesses: WeaknessRecord[]
): { label: string; count: number } | null {
  const entry = essayIssueEntry(issue);
  const label = entry?.label ?? issue.area;
  const record = weaknesses.find(
    (w) =>
      !w.archivedAt &&
      ((entry && w.canonicalId === entry.id) ||
        w.area === label ||
        w.area === issue.area)
  );
  return record ? { label, count: record.count } : null;
}
