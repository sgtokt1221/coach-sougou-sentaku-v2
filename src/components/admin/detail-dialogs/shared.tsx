"use client";

import { useEffect } from "react";
import { markSubmissionViewed } from "@/lib/api/client";
import { useUnviewedSubmissionsMutate } from "@/components/admin/UnviewedSubmissions";

/** 詳細ダイアログの共通の props。一覧からも時系列からも同じ形で開く */
export interface DetailDialogProps {
  studentId: string;
  /** 開く記録の ID。null で閉じる */
  id: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * 開いた1件を自分の既読にする（未確認バッジ用）。
 * 一覧でなくダイアログ側で行うので、時系列から開いても赤い点が消える。
 */
export function useMarkViewedOnOpen(
  kind: "chocoReview" | "summaryDrill" | "logicDrill" | "document",
  id: string | null,
  studentId: string,
) {
  const mutateUnviewed = useUnviewedSubmissionsMutate();
  useEffect(() => {
    if (!id) return;
    void markSubmissionViewed(kind, id, studentId).then(() => mutateUnviewed());
  }, [kind, id, studentId, mutateUnviewed]);
}

/** 読み込み中・見つからない・取得失敗のときにダイアログ内へ出す一文 */
export function DialogStatusText({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground py-8 text-center text-sm">
      {children}
    </div>
  );
}
