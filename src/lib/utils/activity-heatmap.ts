/**
 * 活動ヒートマップ用ユーティリティ関数
 */

/**
 * 直近30日の日付文字列配列を生成 (MM/DD形式)
 */
export function buildLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push(`${month}/${day}`);
  }

  return days;
}

/**
 * ISO日付文字列をMM/DD形式に変換
 */
export function formatDateForHeatmap(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 日付別にアイテムをカウント
 * @param items - 日付を持つアイテム配列
 * @param dateKey - 日付フィールド名
 * @param targetDate - 対象日付 (MM/DD形式)
 */
export function countByDay<T extends Record<string, any>>(
  items: T[],
  dateKey: keyof T,
  targetDate: string
): number {
  return items.filter(item => {
    const itemDate = item[dateKey];
    if (!itemDate) return false;

    try {
      const formatted = formatDateForHeatmap(itemDate);
      return formatted === targetDate;
    } catch {
      return false;
    }
  }).length;
}

/**
 * 複数データソースから活動ヒートマップ用データを生成
 */
export interface ActivityHeatmapData {
  date: string;
  essay: number;
  interview: number;
  skillCheck: number;
  drill: number;          // 要約ドリル
  logicDrill: number;     // 論理ドリル
  topicInput: number;     // ネタインプット
  interviewDrill: number; // 面接ドリル
  selfAnalysis: number;   // 自己分析（ステップ完了）
}

export interface ActivityLog {
  type: "topicInput" | "interviewDrill" | "selfAnalysis";
  createdAt: string;
}

export interface ActivityDataSources {
  essays?: Array<{ submittedAt: string }>;
  interviews?: Array<{ startedAt?: string; createdAt?: string; status?: string }>;
  // SkillCheckResult.takenAt が Date 型のため string | Date 両対応にする
  skillChecks?: Array<{ takenAt?: string | Date; createdAt?: string | Date }>;
  summaryDrills?: Array<{ completedAt?: string; createdAt?: string }>;
  logicDrills?: Array<{ completedAt?: string; createdAt?: string }>;
  activityLogs?: ActivityLog[];
}

export function buildActivityHeatmapData(sources: ActivityDataSources): ActivityHeatmapData[] {
  const last30Days = buildLast30Days();
  const topicInputLogs = (sources.activityLogs ?? []).filter(l => l.type === "topicInput");
  const interviewDrillLogs = (sources.activityLogs ?? []).filter(l => l.type === "interviewDrill");
  const selfAnalysisLogs = (sources.activityLogs ?? []).filter(l => l.type === "selfAnalysis");
  // 面接は「提出 = 完了したセッション」のみカウント。startedAt と createdAt のダブルカウントを廃止。
  const completedInterviews = (sources.interviews ?? []).filter(i => i.status === "completed");

  return last30Days.map(day => ({
    date: day,
    essay: countByDay(sources.essays ?? [], 'submittedAt', day),
    interview: countByDay(completedInterviews, 'startedAt', day),
    skillCheck: countByDay(sources.skillChecks ?? [], 'takenAt', day) +
                countByDay(sources.skillChecks ?? [], 'createdAt', day),
    drill: countByDay(sources.summaryDrills ?? [], 'completedAt', day) +
           countByDay(sources.summaryDrills ?? [], 'createdAt', day),
    logicDrill: countByDay(sources.logicDrills ?? [], 'completedAt', day) +
                countByDay(sources.logicDrills ?? [], 'createdAt', day),
    topicInput: countByDay(topicInputLogs, 'createdAt', day),
    interviewDrill: countByDay(interviewDrillLogs, 'createdAt', day),
    selfAnalysis: countByDay(selfAnalysisLogs, 'createdAt', day),
  }));
}