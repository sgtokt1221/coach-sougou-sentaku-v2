"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trophy,
  Plus,
  ChevronDown,
  Trash2,
  Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import type { ExamResult, ExamResultInput } from "@/lib/types/exam-result";

const STATUS_CONFIG = {
  applied: {
    label: "出願中",
    className: "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  passed: {
    label: "合格",
    className: "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  failed: {
    label: "不合格",
    className: "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  withdrawn: {
    label: "辞退",
    className: "border-gray-400 bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
  },
} as const;

type ExamStatus = keyof typeof STATUS_CONFIG;

interface ExamResultsSectionProps {
  studentId: string;
}

/**
 * 生徒詳細画面に埋め込む受験結果セクション
 * 大学x学部ごとにカード表示 + ステータスバッジ + 追加/変更/削除
 */
export function ExamResultsSection({ studentId }: ExamResultsSectionProps) {
  const {
    data: results,
    mutate,
    isLoading,
  } = useAuthSWR<ExamResult[]>(
    `/api/admin/students/${studentId}/exam-results`
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExamResultInput>({
    universityId: "",
    universityName: "",
    facultyId: "",
    facultyName: "",
    status: "applied",
  });

  const resetForm = useCallback(() => {
    setForm({
      universityId: "",
      universityName: "",
      facultyId: "",
      facultyName: "",
      status: "applied",
    });
  }, []);

  const handleAdd = async () => {
    if (!form.universityName || !form.facultyName) return;
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/exam-results`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        await mutate();
        setDialogOpen(false);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (resultId: string, newStatus: ExamStatus) => {
    await authFetch(
      `/api/admin/students/${studentId}/exam-results/${resultId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );
    await mutate();
  };

  const handleDelete = async (resultId: string) => {
    await authFetch(
      `/api/admin/students/${studentId}/exam-results/${resultId}`,
      { method: "DELETE" }
    );
    await mutate();
  };

  // 集計
  const stats = results
    ? {
        applied: results.filter((r) => r.status === "applied").length,
        passed: results.filter((r) => r.status === "passed").length,
        failed: results.filter((r) => r.status === "failed").length,
        withdrawn: results.filter((r) => r.status === "withdrawn").length,
      }
    : null;

  const passRate =
    stats && stats.passed + stats.failed > 0
      ? Math.round((stats.passed / (stats.passed + stats.failed)) * 100)
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" />
            受験結果
            {stats && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {passRate !== null && `合格率 ${passRate}%`}
                {stats.applied > 0 && ` / 出願中 ${stats.applied}件`}
              </span>
            )}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-1 size-4" />
              結果を追加
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>受験結果を追加</DialogTitle>
                <DialogDescription>
                  大学・学部とステータスを入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="universityName">大学名</Label>
                  <Input
                    id="universityName"
                    value={form.universityName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        universityName: e.target.value,
                      }))
                    }
                    placeholder="例: 東京大学"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facultyName">学部名</Label>
                  <Input
                    id="facultyName"
                    value={form.facultyName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        facultyName: e.target.value,
                      }))
                    }
                    placeholder="例: 法学部"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: string | null) =>
                      setForm((f) => ({
                        ...f,
                        status: (v ?? "applied") as ExamStatus,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(STATUS_CONFIG) as [
                          ExamStatus,
                          (typeof STATUS_CONFIG)[ExamStatus],
                        ][]
                      ).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="examDate">試験日</Label>
                    <Input
                      id="examDate"
                      type="date"
                      value={form.examDate ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examDate: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultDate">結果発表日</Label>
                    <Input
                      id="resultDate"
                      type="date"
                      value={form.resultDate ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          resultDate: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">メモ</Label>
                  <Textarea
                    id="notes"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        notes: e.target.value || undefined,
                      }))
                    }
                    placeholder="備考（任意）"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={saving || !form.universityName || !form.facultyName}
                >
                  {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
                  追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : !results || results.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            受験結果がまだ登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <ExamResultCard
                key={result.id}
                result={result}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExamResultCard({
  result,
  onStatusChange,
  onDelete,
}: {
  result: ExamResult;
  onStatusChange: (id: string, status: ExamStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const config = STATUS_CONFIG[result.status];

  const handleStatus = async (status: ExamStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(result.id, status);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    try {
      await onDelete(result.id);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {result.universityName} {result.facultyName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {result.examDate && (
            <span>
              試験日: {new Date(result.examDate + "T00:00:00").toLocaleDateString("ja-JP")}
            </span>
          )}
          {result.resultDate && (
            <span>
              発表日: {new Date(result.resultDate + "T00:00:00").toLocaleDateString("ja-JP")}
            </span>
          )}
          {result.notes && <span>| {result.notes}</span>}
        </div>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" disabled={updating}>
                {updating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {(Object.entries(STATUS_CONFIG) as [ExamStatus, (typeof STATUS_CONFIG)[ExamStatus]][])
              .filter(([key]) => key !== result.status)
              .map(([key, cfg]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleStatus(key)}
                >
                  {cfg.label}に変更
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1 size-4" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
