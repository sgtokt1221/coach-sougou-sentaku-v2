"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import {
  WeaknessRecord,
  WeaknessReminderLevel,
  getWeaknessReminderLevel,
} from "@/lib/types/growth";

type WeaknessWithLevel = WeaknessRecord & { level: WeaknessReminderLevel };

const levelLabel: Record<WeaknessReminderLevel, string> = {
  critical: "要注意",
  warning: "警告",
  improving: "改善中",
  resolved: "解決済み",
};

const levelBadgeClass: Record<WeaknessReminderLevel, string> = {
  critical: "border-rose-300 bg-rose-100 text-rose-700",
  warning: "border-amber-300 bg-amber-100 text-amber-700",
  improving: "border-emerald-300 bg-emerald-100 text-emerald-700",
  resolved: "border-emerald-300 bg-emerald-100 text-emerald-700",
};

const MAX_DISPLAY = 3;

/** 小論文を書く前に見せる弱点（提出画面の情報入力と、執筆欄の見出しで共用） */
function useEssayWeaknesses() {
  const [weaknesses, setWeaknesses] = useState<WeaknessWithLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeaknesses() {
      try {
        // authFetch でないと本人を特定できず、常に空が返る（カードが出ない）
        const res = await authFetch("/api/growth/weaknesses?context=essay_new");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const items: WeaknessRecord[] = data.weaknesses ?? [];
        const withLevel = items
          .map((w) => ({ ...w, level: getWeaknessReminderLevel(w) }))
          .filter((w): w is WeaknessWithLevel => w.level !== null)
          .slice(0, MAX_DISPLAY);
        setWeaknesses(withLevel);
      } catch {
        setWeaknesses([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWeaknesses();
  }, []);

  return { weaknesses, loading };
}

function daysAgoOf(w: WeaknessRecord): number | null {
  return w.lastOccurred
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(w.lastOccurred).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;
}

/** compact: 弱点名はボタン側に出ているので省き、説明を左詰めにする */
function WeaknessDetail({
  w,
  compact = false,
}: {
  w: WeaknessWithLevel;
  compact?: boolean;
}) {
  const daysAgo = daysAgoOf(w);
  const pad = compact ? "" : "pl-[3.25rem]";
  return (
    <div className={compact ? "space-y-1.5" : "space-y-0.5"}>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`shrink-0 text-xs ${levelBadgeClass[w.level]}`}
        >
          {levelLabel[w.level]}
        </Badge>
        <span className="flex-1 text-sm text-amber-900">
          {compact ? "" : w.area}
        </span>
        <span className="text-xs text-amber-700/70">
          {w.count}回
          {daysAgo !== null && ` · ${daysAgo === 0 ? "今日" : `${daysAgo}日前`}`}
        </span>
      </div>
      {w.description && (
        <p className={`${pad} text-xs leading-relaxed text-amber-900/80`}>
          {w.description}
        </p>
      )}
      {/* ラベルだけだと誰の弱点も同じ文言になる。直近の答案の話を出す */}
      {w.lastExample && (
        <p className={`${pad} text-xs leading-relaxed text-amber-800/80`}>
          直近: {w.lastExample}
        </p>
      )}
    </div>
  );
}

export function WeaknessReminderCard() {
  const { weaknesses, loading } = useEssayWeaknesses();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (weaknesses.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-4" />
          書く前にチェック
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {weaknesses.map((w) => (
          <WeaknessDetail key={w.area} w={w} />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * 1つの弱点のボタン。マウスを乗せると詳細が出て、押すと開いたままになる。
 * 開いても入力欄から入力位置を奪わない（書いている最中に乗せても打ち続けられる）。
 */
function WeaknessChip({ w }: { w: WeaknessWithLevel }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  return (
    <Popover
      open={hover || pinned}
      onOpenChange={(open) => {
        if (!open) {
          setHover(false);
          setPinned(false);
        }
      }}
    >
      <PopoverAnchor asChild>
        <button
          type="button"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => setPinned((p) => !p)}
          className={`rounded-full border px-2.5 py-1 text-left text-xs leading-snug font-medium ${levelBadgeClass[w.level]}`}
        >
          {w.area}
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-80 border-amber-200 bg-amber-50 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <WeaknessDetail w={w} compact />
      </PopoverContent>
    </Popover>
  );
}

/** 執筆欄の見出しに並べる弱点のボタン（詳細は乗せる・押すで出す） */
export function WeaknessChips() {
  const { weaknesses } = useEssayWeaknesses();
  if (weaknesses.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
      {weaknesses.map((w) => (
        <WeaknessChip key={w.area} w={w} />
      ))}
    </div>
  );
}
