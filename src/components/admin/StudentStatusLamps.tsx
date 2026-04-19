import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentListItem } from "@/lib/types/admin";

interface StudentStatusLampsProps {
  alertFlags: StudentListItem["alertFlags"];
  className?: string;
  maxVisible?: number;
}

type FlagInfo = {
  color: string;
  bgColor: string;
  ringColor: string;
  message: string;
  severity: "critical" | "high" | "warning";
};

const FLAG_CONFIG: Record<string, FlagInfo> = {
  // Critical (赤)
  inactive: {
    color: "bg-red-500",
    bgColor: "bg-red-500",
    ringColor: "ring-red-200",
    message: "7日以上活動なし",
    severity: "critical",
  },
  document_deadline: {
    color: "bg-red-500",
    bgColor: "bg-red-500",
    ringColor: "ring-red-200",
    message: "書類期限が迫っている",
    severity: "critical",
  },

  // High (オレンジ)
  declining: {
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    ringColor: "ring-orange-200",
    message: "スコア下降傾向",
    severity: "high",
  },
  weakness_stuck: {
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    ringColor: "ring-orange-200",
    message: "弱点が改善せず停滞",
    severity: "high",
  },
  ap_struggle: {
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    ringColor: "ring-orange-200",
    message: "AP合致度が低迷",
    severity: "high",
  },
  deadline_risk: {
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    ringColor: "ring-orange-200",
    message: "期限内に完成しない恐れ",
    severity: "high",
  },

  // Warning (黄)
  repeated_weakness: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500",
    ringColor: "ring-yellow-200",
    message: "弱点の繰り返し指摘が多い",
    severity: "warning",
  },
  score_plateau: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500",
    ringColor: "ring-yellow-200",
    message: "スコアが頭打ち",
    severity: "warning",
  },
};

// 順調時の緑ドット
const HEALTHY_DOT = {
  color: "bg-emerald-500",
  bgColor: "bg-emerald-500",
  ringColor: "ring-emerald-200",
  message: "順調に進捗中",
  severity: "healthy" as const,
};

export function StudentStatusLamps({
  alertFlags,
  className,
  maxVisible = 4
}: StudentStatusLampsProps) {
  // フラグがない場合は緑ドット1つ
  if (alertFlags.length === 0) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div
          className={cn(
            "size-2.5 rounded-full transition-transform hover:scale-125 hover:ring-2",
            HEALTHY_DOT.bgColor,
            "hover:" + HEALTHY_DOT.ringColor
          )}
          title={HEALTHY_DOT.message}
        />
      </div>
    );
  }

  // 重要度順でソート（critical > high > warning）
  const sortedFlags = [...alertFlags].sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, warning: 1 };
    const configA = FLAG_CONFIG[a];
    const configB = FLAG_CONFIG[b];
    if (!configA || !configB) return 0;
    return severityOrder[configB.severity] - severityOrder[configA.severity];
  });

  const visibleFlags = sortedFlags.slice(0, maxVisible);
  const hiddenCount = sortedFlags.length - visibleFlags.length;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {visibleFlags.map((flag, index) => {
        const config = FLAG_CONFIG[flag];
        if (!config) return null;

        return (
          <div
            key={`${flag}-${index}`}
            className={cn(
              "size-2.5 rounded-full transition-transform hover:scale-125 hover:ring-2",
              config.bgColor,
              "hover:" + config.ringColor
            )}
            title={config.message}
          />
        );
      })}

      {hiddenCount > 0 && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-5 ml-0.5"
          title={`他${hiddenCount}件の要注意項目があります`}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}