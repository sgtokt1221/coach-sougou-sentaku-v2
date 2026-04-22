import type { SessionType } from "./session";

export type CalendarEventType =
  | "session"
  | "app_start"
  | "app_end"
  | "exam"
  | "result"
  | "custom"
  | "holiday";

export interface CalendarEvent {
  /** iCal UID 互換のグローバルユニークID (将来 iCal 同期で利用) */
  uid: string;
  /** React key 用。uid と同一 */
  id: string;
  /** ISO 8601 開始日時 */
  startAt: string;
  /** ISO 8601 終了日時 */
  endAt: string;
  /** 終日イベント (大学日程=true, セッション=false) */
  allDay: boolean;
  /** YYYY-MM-DD (UI 日グループ化用の冗長保持) */
  date: string;
  type: CalendarEventType;
  /** タイトル */
  label: string;
  /** 詳細 (iCal DESCRIPTION 相当) */
  description?: string;
  /** 場所 (iCal LOCATION 相当, meetLink 等) */
  location?: string;
  /** 関連生徒名 */
  studentNames: string[];
  /** 管理ポータル内遷移先 */
  href?: string;
  sessionType?: SessionType;
  /** 管理者カスタムイベントの Firestore ID (custom のみ)。編集/削除時に使用 */
  adminEventId?: string;
}

export const CALENDAR_EVENT_COLORS: Record<CalendarEventType, string> = {
  session: "bg-sky-500",
  app_start: "bg-amber-400",
  app_end: "bg-amber-500",
  exam: "bg-rose-500",
  result: "bg-emerald-500",
  custom: "bg-violet-500",
  holiday: "bg-rose-400",
};

export const CALENDAR_EVENT_LABELS: Record<CalendarEventType, string> = {
  session: "セッション",
  app_start: "出願開始",
  app_end: "出願締切",
  exam: "試験日",
  result: "合格発表",
  custom: "予定",
  holiday: "祝日",
};
