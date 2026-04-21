/**
 * 管理者カスタムカレンダーイベント
 *
 * Firestore パス: `adminEvents/{eventId}`
 * 用途: 塾イベント(休校日、保護者説明会、模試、講師研修 等)を管理者がカレンダー上で作成
 */
export interface AdminEvent {
  id: string;
  /** イベントのタイトル (必須) */
  title: string;
  /** YYYY-MM-DD (終日 or 当該日) */
  date: string;
  /** 終日イベントか否か */
  allDay: boolean;
  /** 開始時刻 HH:MM (allDay=false のみ) */
  startTime?: string;
  /** 終了時刻 HH:MM (allDay=false のみ) */
  endTime?: string;
  /** 場所 (任意) */
  location?: string;
  /** 詳細メモ (任意) */
  description?: string;
  /** 作成した admin/teacher/superadmin の uid (スコーピング用) */
  createdByAdminId: string;
  /** 作成日時 (Firestore Timestamp を ISO string化) */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/** API request body 用 (id, createdByAdminId, createdAt, updatedAt はサーバーで設定) */
export type AdminEventInput = Omit<
  AdminEvent,
  "id" | "createdByAdminId" | "createdAt" | "updatedAt"
>;
