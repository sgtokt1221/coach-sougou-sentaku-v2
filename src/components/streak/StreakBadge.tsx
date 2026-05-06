"use client";

import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWritingStreak } from "@/hooks/useWritingStreak";
import { STREAK_BADGES } from "@/lib/streak/badges";

interface StreakBadgeProps {
  variant: "full" | "mini";
}

export function StreakBadge({ variant }: StreakBadgeProps) {
  const { streak, isLoading } = useWritingStreak();

  if (isLoading) {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted animate-pulse">
          <Flame className="size-4" />
          <span className="text-sm">-</span>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            読み込み中...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streak) {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50">
          <Flame className="size-4 text-gray-400" />
          <span className="text-sm text-muted-foreground">0</span>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-5 text-gray-400" />
            執筆ストリーク
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">初日に挑戦しよう！</p>
        </CardContent>
      </Card>
    );
  }

  const currentBadges = STREAK_BADGES.filter(badge =>
    streak.badges.includes(badge.id)
  );

  if (variant === "mini") {
    const handleClick = () => {
      const streakSection = document.getElementById("streak");
      if (streakSection) {
        streakSection.scrollIntoView({ behavior: "smooth" });
      } else {
        // dashboardページでない場合は遷移
        window.location.href = "/student/dashboard#streak";
      }
    };

    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 transition-colors"
      >
        <Flame className="size-4 text-orange-500" />
        <span className="text-sm font-semibold text-orange-600">
          {streak.current}
        </span>
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-5 text-orange-500" />
          執筆ストリーク
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600 mb-1">
            {streak.current}日
          </div>
          <div className="text-sm text-muted-foreground">
            継続中
          </div>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">最長記録: </span>
          <span className="font-semibold">{streak.longest}日</span>
        </div>

        {currentBadges.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">取得バッジ</div>
            <div className="flex flex-wrap gap-1">
              {currentBadges.map(badge => (
                <Badge key={badge.id} variant="secondary" className="text-xs">
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {streak.current === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            小論文を書いてストリークを始めよう！
          </p>
        )}
      </CardContent>
    </Card>
  );
}
