/**
 * 管理者の「活動状況（直近30日）」の集計。
 *
 * 以前は生徒詳細ページが別目的の一覧API 7本を取り寄せて画面側で数えていたため、
 * 一覧の形が変わるたびに黙って数え漏れていた（面接は一覧が status/startedAt を
 * 返さなくなっていて常に0件、書類は最後に保存した日にしか数えない、等）。
 * いまは /api/admin/students/[id]/activity-heatmap がコレクションを直接読み、
 * ここで日本時間の日ごとに数える。
 */

export const HEATMAP_DAYS = 30;

export interface ActivityHeatmapData {
  date: string; // M/D（日本時間）
  essay: number;
  interview: number;
  drill: number; // 要約ドリル
  logicDrill: number; // 論理ドリル
  choco: number; // ちょこ添削
  topicInput: number; // ネタインプット
  interviewDrill: number; // 面接ドリル
  selfAnalysis: number; // 自己分析（ステップ完了）
  document: number; // 提出書類（その日に書いた・添削した書類の数）
  activity: number; // 活動実績（その日に登録・更新した件数）
}

export type ActivityHeatmapKey = Exclude<keyof ActivityHeatmapData, "date">;

export const ACTIVITY_HEATMAP_KEYS: ActivityHeatmapKey[] = [
  "essay",
  "interview",
  "drill",
  "logicDrill",
  "choco",
  "topicInput",
  "interviewDrill",
  "selfAnalysis",
  "document",
  "activity",
];

export interface HeatmapEvent {
  key: ActivityHeatmapKey;
  /** Timestamp / Date / ISO文字列 / ミリ秒のどれでもよい */
  at: unknown;
  /**
   * 同じ日に同じ group は1回だけ数える。
   * 書類を1日に何度保存しても「その日に書いた書類1件」にするため。
   */
  group?: string;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function toMillis(v: unknown): number | null {
  if (v == null) return null;
  const withToDate = v as { toDate?: () => Date };
  if (typeof withToDate.toDate === "function") return withToDate.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

/** 日本時間の日付キー（YYYY-MM-DD）。サーバーは UTC で動くので必ずこれで区切る */
export function jstDayKey(ms: number): string {
  return new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 集計の初日（日本時間 0:00）のミリ秒 */
export function heatmapStartMs(nowMs: number): number {
  const firstDay = jstDayKey(nowMs - (HEATMAP_DAYS - 1) * DAY_MS);
  return Date.parse(`${firstDay}T00:00:00+09:00`);
}

function emptyDay(dayKey: string): ActivityHeatmapData {
  const [, m, d] = dayKey.split("-").map(Number);
  return {
    date: `${m}/${d}`,
    essay: 0,
    interview: 0,
    drill: 0,
    logicDrill: 0,
    choco: 0,
    topicInput: 0,
    interviewDrill: 0,
    selfAnalysis: 0,
    document: 0,
    activity: 0,
  };
}

export function buildActivityHeatmapData(
  events: HeatmapEvent[],
  nowMs: number = Date.now(),
): ActivityHeatmapData[] {
  const startMs = heatmapStartMs(nowMs);
  const days = new Map<string, ActivityHeatmapData>();
  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const key = jstDayKey(startMs + i * DAY_MS);
    days.set(key, emptyDay(key));
  }

  const seen = new Set<string>();
  for (const e of events) {
    const ms = toMillis(e.at);
    if (ms === null || ms < startMs || ms > nowMs) continue;
    const dayKey = jstDayKey(ms);
    const day = days.get(dayKey);
    if (!day) continue;
    if (e.group) {
      const dedupe = `${e.key}|${e.group}|${dayKey}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
    }
    day[e.key] += 1;
  }

  return [...days.values()];
}
