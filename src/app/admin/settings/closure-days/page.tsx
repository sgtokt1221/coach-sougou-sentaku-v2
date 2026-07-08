"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";

/** 休校日 1 件（API レスポンス形状） */
interface ClosureDayItem {
  id: string;
  date: string;
  note?: string;
}

/**
 * 管理者ポータル「休校日設定」ページ。
 * ここで登録した休校日は定期授業の月次生成で除外される。
 */
export default function ClosureDaysSettingsPage() {
  const {
    data: days = [],
    error,
    mutate,
  } = useAuthSWR<ClosureDayItem[]>("/api/admin/closure-days");

  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!date) {
      toast.error("日付を選択してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/closure-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note: note || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("休校日を登録しました");
      setDate("");
      setNote("");
      await mutate();
    } catch {
      toast.error("休校日の登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d: ClosureDayItem) => {
    if (!confirm(`${d.date} の休校日を削除しますか？`)) return;
    try {
      const res = await authFetch(`/api/admin/closure-days?id=${d.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("削除しました");
      await mutate();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 lg:space-y-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight lg:text-2xl">
          休校日設定
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ここで登録した休校日は定期授業の月次生成で除外されます（祝日は自動では除外されません）。
        </p>
      </div>

      {error && (
        <ApiErrorBanner error={error} title="休校日の取得に失敗しました" />
      )}

      {/* 追加フォーム */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">休校日を追加</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">日付</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              メモ（任意）
            </label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: お盆休み"
            />
          </div>
          <Button onClick={handleAdd} disabled={submitting}>
            追加
          </Button>
        </div>
      </Card>

      {/* 一覧 */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">日付</th>
                <th className="px-3 py-2 font-medium">メモ</th>
                <th className="px-3 py-2 font-medium">削除</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    休校日が登録されていません
                  </td>
                </tr>
              ) : (
                days.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{d.date}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.note ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(d)}
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
