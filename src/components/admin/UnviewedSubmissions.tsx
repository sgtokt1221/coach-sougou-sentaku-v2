"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { markAllSubmissionsViewed } from "@/lib/api/client";
import type { SubmissionKind } from "@/lib/api/submission-kinds";

export interface UnviewedSubmissionsData {
  total: number;
  /** 生徒 uid → 未確認件数 */
  byStudent: Record<string, number>;
  /** 生徒 uid → 種別ごとの未確認件数（生徒詳細のタブバッジ用） */
  byStudentKind: Record<string, Partial<Record<SubmissionKind, number>>>;
  /** 種別ごとの未確認 ID */
  ids: Partial<Record<SubmissionKind, string[]>>;
}

const UNVIEWED_KEY = "/api/admin/unviewed-submissions";

/**
 * 自分がまだ開いていない提出物の件数。
 *
 * poll はバッジ本体だけ true にする。購読側すべてが refreshInterval を持つと
 * 購読数ぶんのタイマーが動き、リクエストが増える。
 */
export function useUnviewedSubmissions(enabled = true, poll = false) {
  const { data, mutate } = useAuthSWR<UnviewedSubmissionsData>(
    enabled ? UNVIEWED_KEY : null,
    poll ? { refreshInterval: 60000 } : undefined,
  );
  return { data, mutate };
}

/**
 * 件数の再取得だけしたい画面用。購読しないのでタイマーも再レンダーも増えない。
 * 提出物を開いた直後にバッジを減らす用途。
 */
export function useUnviewedSubmissionsMutate() {
  const { mutate } = useSWRConfig();
  return useCallback(() => mutate(UNVIEWED_KEY), [mutate]);
}

/** サイドバーの「通知」に出す未確認件数バッジ。 */
export function UnviewedSubmissionsBadge() {
  const { data } = useUnviewedSubmissions(true, true);
  const count = data?.total ?? 0;
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-none tabular-nums text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * 生徒一覧の行に出す未確認件数バッジ。
 *
 * 件数は親で1回だけ取得して渡すこと。行ごとに useUnviewedSubmissions を呼ぶと
 * 行数ぶんのポーリングが走り、生徒が増えるほどリクエストが増える
 * （実際に毎分20回近く叩いて画面が固まった）。
 */
export function StudentUnviewedBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      title="まだ開いていない提出物"
      className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-none tabular-nums text-destructive-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** タブ見出しの右に付ける小さな件数バッジ。 */
export function TabUnviewedBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      title="まだ開いていない提出物"
      className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none tabular-nums text-destructive-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * 未確認をまとめて既読にするボタン。
 *
 * 提出を1件ずつ開かないと赤が消えないと、溜まったときに実質消せなくなる。
 * サーバー側もバッジと同じ集計を使うので、押せば必ず 0 になる。
 */
export function MarkAllViewedButton() {
  const { data } = useUnviewedSubmissions();
  const mutateUnviewed = useUnviewedSubmissionsMutate();
  const [busy, setBusy] = useState(false);
  const count = data?.total ?? 0;
  if (count === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const n = await markAllSubmissionsViewed();
          await mutateUnviewed();
          toast.success(`${n}件を既読にしました`);
        } catch {
          toast.error("既読にできませんでした");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCheck className="size-4" />
      )}
      未確認{count}件をすべて既読にする
    </Button>
  );
}
