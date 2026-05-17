import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentListItem } from "@/lib/types/admin";

interface StudentStatusLampsProps {
  alertFlags: StudentListItem["alertFlags"];
  lastActivityAt: string | null;
  className?: string;
  maxVisible?: number;
}

type ActivityLevel = "active" | "moderate" | "danger" | "none";

type FlagInfo = {
  message: string;
  severity: "critical" | "high" | "warning";
};

const FLAG_CONFIG: Record<string, FlagInfo> = {
  // Critical (赤)
  inactive: {
    message: "7日以上活動なし",
    severity: "critical",
  },
  document_deadline: {
    message: "書類期限が迫っている",
    severity: "critical",
  },

  // High (濃い amber)
  declining: {
    message: "スコア下降傾向",
    severity: "high",
  },
  weakness_stuck: {
    message: "弱点が改善せず停滞",
    severity: "high",
  },
  ap_struggle: {
    message: "AP合致度が低迷",
    severity: "high",
  },
  deadline_risk: {
    message: "期限内に完成しない恐れ",
    severity: "high",
  },

  // Warning (淡い amber)
  repeated_weakness: {
    message: "弱点の繰り返し指摘が多い",
    severity: "warning",
  },
  score_plateau: {
    message: "スコアが頭打ち",
    severity: "warning",
  },
};

/**
 * 最終活動日から活動レベルを判定
 */
function getActivityLevel(lastActivityAt: string | null): {
  level: ActivityLevel;
  days: number | null;
  label: string;
  dotColor: string;
  labelColor: string;
} {
  if (!lastActivityAt) {
    return {
      level: "none",
      days: null,
      label: "未活動",
      dotColor: "bg-slate-400",
      labelColor: "text-slate-500 dark:text-slate-400",
    };
  }

  const now = new Date();
  const lastActivity = new Date(lastActivityAt);
  const diffDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return {
      level: "active",
      days: diffDays,
      label: "アクティブ",
      dotColor: "bg-emerald-500",
      labelColor: "text-emerald-700 dark:text-emerald-400",
    };
  } else if (diffDays <= 14) {
    return {
      level: "moderate",
      days: diffDays,
      label: "やや停滞",
      dotColor: "bg-amber-500",
      labelColor: "text-amber-700 dark:text-amber-400",
    };
  } else {
    return {
      level: "danger",
      days: diffDays,
      label: "非アクティブ",
      dotColor: "bg-rose-500",
      labelColor: "text-rose-700 dark:text-rose-400",
    };
  }
}

/**
 * 最終活動日の詳細テキストを生成
 */
function getActivityDetailText(lastActivityAt: string | null, days: number | null): string {
  if (!lastActivityAt || days === null) {
    return "活動履歴なし";
  }

  const date = new Date(lastActivityAt);
  const dateStr = date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `最終活動: ${dateStr} (${days}日前)`;
}

export function StudentStatusLamps({
  alertFlags,
  lastActivityAt,
  className,
  maxVisible = 4
}: StudentStatusLampsProps) {
  const activity = getActivityLevel(lastActivityAt);
  const detailText = getActivityDetailText(lastActivityAt, activity.days);

  return (
    <div
      className={cn("relative inline-flex items-center gap-1.5 cursor-help", className)}
      title={detailText}
    >
      <span className="relative inline-flex h-2.5 w-2.5">
        {/* 赤（非アクティブ）の場合はパルスリング */}
        {activity.level === "danger" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        )}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", activity.dotColor)} />
      </span>

      <span className={cn("text-xs font-medium", activity.labelColor)}>
        {activity.label}
      </span>

      <span className="text-[10px] text-muted-foreground tabular-nums">
        {activity.days !== null ? `${activity.days}d` : "-"}
      </span>

      {/* alertFlags が 1 以上ある場合の補助バッジ */}
      {alertFlags.length > 0 && (
        <span
          className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-100 px-1 text-[10px] font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300"
          title={alertFlags.map(flag => FLAG_CONFIG[flag]?.message || flag).join(", ")}
        >
          ⚠ {alertFlags.length}
        </span>
      )}

      {/* アクセシビリティ: スクリーンリーダー用 */}
      <span className="sr-only">{detailText}</span>
    </div>
  );
}