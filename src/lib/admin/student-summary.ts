/**
 * 生徒詳細の上部の帯（要対応・重要な弱点・次の面談）の中身を組む純関数。
 * DB は読まない。読むのは /api/admin/students/[id]。
 */
import { parseSessionTime } from "@/lib/admin/session-time";
import { isDocumentComplete, type DocumentStatus } from "@/lib/types/document";
import {
  getWeaknessReminderLevel,
  type WeaknessRecord,
} from "@/lib/types/growth";

export interface SummaryActionItem {
  kind: "document" | "homework";
  id: string;
  label: string; // 「志望理由書の期限 あと3日」「宿題『…』期限切れ」
}

export interface SummaryWeakness {
  area: string;
  /** 直近の記録での指摘回数と母数（「直近5回中4回」）。旧データは null */
  recent: { hits: number; of: number } | null;
  /** 累計の指摘回数（直近の記録が無い旧データでは、これを出す） */
  count: number;
  level: "critical" | "warning";
}

export interface StudentSummary {
  actionItems: SummaryActionItem[];
  topWeaknesses: SummaryWeakness[];
  /** scheduledAt は UTC の ISO 文字列（保存値の日本時間文字列ではない） */
  nextSession: { id: string; scheduledAt: string; typeLabel: string } | null;
  /** 前回の面談の振り返りの1行（nextAgendaSeed、無ければ notes の1行目） */
  lastDebriefLine: string | null;
  teacherNames: string[];
}

const DAY = 86400000;
const JST_OFFSET = 9 * 3600000;

/**
 * 日本時間の暦日の通し番号。サーバーが UTC で動いていても日がずれないよう、
 * 「今日」と期限の両方を日本時間の日付に直してから比べる。
 * 日付だけ（YYYY-MM-DD）はその日本時間の日、ゾーン無しの時刻は日本時間として読む。
 */
function jstDayNumber(v: string | number): number {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return Math.floor(Date.parse(`${v}T00:00:00Z`) / DAY);
  }
  const ms = typeof v === "number" ? v : parseSessionTime(v);
  if (ms === null || Number.isNaN(ms)) return NaN;
  return Math.floor((ms + JST_OFFSET) / DAY);
}

export function buildActionItems(input: {
  documents: {
    id: string;
    /** 表示名（志望理由書 など） */
    type: string;
    deadline?: string | null;
    status: string;
  }[];
  homework: {
    id: string;
    title: string;
    dueDate?: string | null;
    status: string;
  }[];
  now: Date;
}): SummaryActionItem[] {
  const today = jstDayNumber(input.now.getTime());
  const daysUntil = (s: string) => jstDayNumber(s) - today;
  const items: SummaryActionItem[] = [];
  for (const d of input.documents) {
    if (!d.deadline || isDocumentComplete(d.status as DocumentStatus)) continue;
    const n = daysUntil(d.deadline);
    if (Number.isNaN(n) || n > 7) continue;
    items.push({
      kind: "document",
      id: d.id,
      label:
        n < 0
          ? `${d.type}の期限切れ（${-n}日超過）`
          : n === 0
            ? `${d.type}の期限 今日`
            : `${d.type}の期限 あと${n}日`,
    });
  }
  for (const h of input.homework) {
    if (h.status !== "assigned" && h.status !== "in_progress") continue;
    if (!h.dueDate) continue;
    const n = daysUntil(h.dueDate);
    if (Number.isNaN(n) || n > 2) continue;
    items.push({
      kind: "homework",
      id: h.id,
      label:
        n < 0
          ? `宿題「${h.title}」期限切れ`
          : `宿題「${h.title}」期限 ${n === 0 ? "今日" : `あと${n}日`}`,
    });
  }
  return items;
}

export function buildTopWeaknesses(
  records: WeaknessRecord[],
  max = 3
): SummaryWeakness[] {
  const rank = { critical: 0, warning: 1 } as const;
  return records
    .filter((w) => !w.archivedAt && !w.resolved)
    .map((w) => ({ w, level: getWeaknessReminderLevel(w) }))
    .filter(
      (x): x is { w: WeaknessRecord; level: "critical" | "warning" } =>
        x.level === "critical" || x.level === "warning"
    )
    .sort((a, b) => rank[a.level] - rank[b.level] || b.w.count - a.w.count)
    .slice(0, max)
    .map(({ w, level }) => ({
      area: w.area,
      level,
      count: w.count,
      recent:
        w.recentHits && w.recentHits.length > 0
          ? {
              hits: w.recentHits.reduce((s, x) => s + x, 0),
              of: w.recentHits.length,
            }
          : null,
    }));
}

export function firstLine(text: string | null | undefined): string | null {
  const line = (text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  return line ? line.slice(0, 80) : null;
}
