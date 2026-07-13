"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthSWR } from "@/lib/api/swr";
import { authFetch } from "@/lib/api/client";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import { ONE_ON_ONE_TYPES } from "@/lib/types/recurring-class";
import type {
  RecurringClassTemplate,
  GenPreviewItem,
} from "@/lib/types/recurring-class";
import { SESSION_TYPE_LABELS } from "@/lib/types/session";
import type { SessionType } from "@/lib/types/session";
import type { StudentListItem, TeacherListItem } from "@/lib/types/admin";

/** 曜日ラベル（0=日 .. 6=土） */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 週グリッドの列順（月〜日） */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** 生成ソース種別 */
type GenSource = "master" | "previous-month";

interface GenCounts {
  toCreate: number;
  skippedClosure: number;
  skippedDuplicate: number;
}

interface GenResponse {
  created?: number;
  counts: GenCounts;
  toCreate: GenPreviewItem[];
  skippedClosure: GenPreviewItem[];
  skippedDuplicate: GenPreviewItem[];
}

interface Props {
  coachStudents: StudentListItem[];
}

/** 当月 "YYYY-MM" を返す。 */
function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 定期授業マスタパネル。テンプレの一覧/追加/有効切替/削除と、
 * マスタ or 前月コピーからの月次一括生成（プレビュー→確定）を提供する。
 */
export default function RecurringMasterPanel({ coachStudents }: Props) {
  const {
    data: templates = [],
    error: templatesError,
    mutate: mutateTemplates,
  } = useAuthSWR<RecurringClassTemplate[]>("/api/admin/recurring-templates");
  const { data: teachers = [] } = useAuthSWR<TeacherListItem[]>(
    "/api/admin/teachers/all",
  );

  // 追加フォーム
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [type, setType] = useState<SessionType>(ONE_ON_ONE_TYPES[0]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("19:00");
  const [duration, setDuration] = useState("60");
  const [format, setFormat] = useState<"online" | "offline">("offline");
  const [submitting, setSubmitting] = useState(false);

  // 生成フロー
  const [genSource, setGenSource] = useState<GenSource | null>(null);
  const [genMonth, setGenMonth] = useState(currentMonthStr());
  const [genPreview, setGenPreview] = useState<GenResponse | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleAdd = async () => {
    if (!studentId || !teacherId || !startTime) {
      toast.error("生徒・講師・時刻は必須です");
      return;
    }
    const student = coachStudents.find((s) => s.uid === studentId);
    const teacher = teachers.find((t) => t.uid === teacherId);
    setSubmitting(true);
    try {
      const res = await authFetch("/api/admin/recurring-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName: student?.displayName ?? "",
          teacherId,
          teacherName: teacher?.displayName ?? "",
          type,
          weekday,
          startTime,
          duration: duration ? Number(duration) : null,
          format,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("定期授業テンプレを追加しました");
      setStudentId("");
      setTeacherId("");
      await mutateTemplates();
    } catch {
      toast.error("テンプレの追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (t: RecurringClassTemplate) => {
    try {
      const res = await authFetch(`/api/admin/recurring-templates?id=${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      });
      if (!res.ok) throw new Error();
      await mutateTemplates();
    } catch {
      toast.error("状態の変更に失敗しました");
    }
  };

  const handleDelete = async (t: RecurringClassTemplate) => {
    if (!confirm(`${t.studentName} の定期授業テンプレを削除しますか？`)) return;
    try {
      const res = await authFetch(`/api/admin/recurring-templates?id=${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("削除しました");
      await mutateTemplates();
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  // プレビュー取得（dryRun:true）
  const openGenerate = (source: GenSource) => {
    setGenSource(source);
    setGenMonth(currentMonthStr());
    setGenPreview(null);
  };

  const runPreview = async () => {
    if (!genSource) return;
    setGenerating(true);
    try {
      const res = await authFetch("/api/admin/sessions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: genMonth, source: genSource, dryRun: true }),
      });
      if (!res.ok) throw new Error();
      setGenPreview((await res.json()) as GenResponse);
    } catch {
      toast.error("プレビューの取得に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  // 確定作成（dryRun:false）
  const confirmGenerate = async () => {
    if (!genSource) return;
    setGenerating(true);
    try {
      const res = await authFetch("/api/admin/sessions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: genMonth, source: genSource, dryRun: false }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as GenResponse;
      toast.success(`${data.created ?? 0}件の授業を作成しました`);
      setGenSource(null);
      setGenPreview(null);
    } catch {
      toast.error("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const inputClass = "w-full rounded-md border px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      {templatesError && (
        <ApiErrorBanner
          error={templatesError}
          title="定期授業テンプレの取得に失敗しました"
        />
      )}

      {/* 生成アクション */}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="w-full sm:w-auto" onClick={() => openGenerate("master")}>
          今月分を生成
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => openGenerate("previous-month")}
        >
          前月をコピー
        </Button>
        <Link
          href="/admin/settings/closure-days"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground sm:ml-auto"
        >
          休校日設定
        </Link>
      </div>

      {/* 追加フォーム */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">定期授業テンプレを追加</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">生徒</label>
            <select
              className={inputClass}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">-- 生徒を選択 --</option>
              {coachStudents.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">担当講師</label>
            <select
              className={inputClass}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">-- 講師を選択 --</option>
              {teachers.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">種別</label>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value as SessionType)}
            >
              {ONE_ON_ONE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">曜日</label>
            <select
              className={inputClass}
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">時刻</label>
            <input
              type="time"
              className={inputClass}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">所要(分)</label>
              <input
                type="number"
                min={30}
                step={30}
                className={inputClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">形態</label>
              <select
                className={inputClass}
                value={format}
                onChange={(e) => setFormat(e.target.value as "online" | "offline")}
              >
                <option value="offline">対面</option>
                <option value="online">オンライン</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={handleAdd} disabled={submitting}>
            追加
          </Button>
        </div>
      </Card>

      {/* テンプレ週グリッド（月〜日の時間割） */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">定期授業マスタ（週の時間割）</h2>
          <span className="text-xs text-muted-foreground">{templates.length}件</span>
        </div>
        {templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            定期授業テンプレがありません。上のフォームから追加してください。
          </p>
        ) : (
          <>
            {/* PC(lg): 月〜日の週グリッド（横スクロール） */}
            <div className="hidden overflow-x-auto lg:block">
              <div className="grid min-w-[840px] grid-cols-7 gap-2">
                {WEEK_ORDER.map((wd) => {
                  const dayTemplates = templates
                    .filter((t) => t.weekday === wd)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const isWeekend = wd === 0 || wd === 6;
                  return (
                    <div key={wd} className="overflow-hidden rounded-lg border bg-muted/20">
                      <div
                        className={`border-b px-2 py-1.5 text-center text-xs font-semibold ${
                          isWeekend ? "text-rose-500" : ""
                        }`}
                      >
                        {WEEKDAY_LABELS[wd]}
                      </div>
                      <div className="min-h-[88px] space-y-1.5 p-1.5">
                        {dayTemplates.length === 0 ? (
                          <p className="pt-5 text-center text-[10px] text-muted-foreground/40">
                            —
                          </p>
                        ) : (
                          dayTemplates.map((t) => (
                            <div
                              key={t.id}
                              className={`rounded-md border p-2 text-xs transition-colors ${
                                t.active ? "bg-card" : "bg-muted/40 opacity-60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-semibold tabular-nums">
                                  {t.startTime}
                                </span>
                                <Badge variant="outline" className="px-1 py-0 text-[9px]">
                                  {SESSION_TYPE_LABELS[t.type] ?? t.type}
                                </Badge>
                              </div>
                              <p className="mt-0.5 truncate font-medium">{t.studentName}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {t.teacherName}
                              </p>
                              <div className="mt-1 flex items-center justify-between">
                                <Switch
                                  checked={t.active}
                                  onCheckedChange={() => handleToggleActive(t)}
                                  className="origin-left scale-75"
                                />
                                <button
                                  onClick={() => handleDelete(t)}
                                  className="text-[10px] text-rose-600 hover:underline"
                                >
                                  削除
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* モバイル: 曜日別の縦積みセクション */}
            <div className="space-y-4 lg:hidden">
              {WEEK_ORDER.map((wd) => {
                const dayTemplates = templates
                  .filter((t) => t.weekday === wd)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                if (dayTemplates.length === 0) return null;
                const isWeekend = wd === 0 || wd === 6;
                return (
                  <div key={wd}>
                    <h3
                      className={`mb-1.5 text-xs font-semibold ${
                        isWeekend ? "text-rose-500" : "text-muted-foreground"
                      }`}
                    >
                      {WEEKDAY_LABELS[wd]}曜日
                    </h3>
                    <div className="space-y-2">
                      {dayTemplates.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-md border p-3 transition-colors ${
                            t.active ? "bg-card" : "bg-muted/40 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-semibold tabular-nums">
                              {t.startTime}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {SESSION_TYPE_LABELS[t.type] ?? t.type}
                            </Badge>
                          </div>
                          <p className="mt-1 font-medium">{t.studentName}</p>
                          <p className="text-xs text-muted-foreground">{t.teacherName}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Switch
                                checked={t.active}
                                onCheckedChange={() => handleToggleActive(t)}
                              />
                              {t.active ? "有効" : "無効"}
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => handleDelete(t)}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* 生成ダイアログ（月選択 → プレビュー → 確定） */}
      <Dialog
        open={genSource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGenSource(null);
            setGenPreview(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {genSource === "previous-month" ? "前月をコピー" : "今月分を生成"}
            </DialogTitle>
            <DialogDescription>
              {genSource === "previous-month"
                ? "前月の1:1授業枠を対象月に複写します（欠席は複写されません）。"
                : "定期授業マスタから対象月の授業を生成します。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">対象月</label>
              <input
                type="month"
                className={inputClass}
                value={genMonth}
                onChange={(e) => {
                  setGenMonth(e.target.value);
                  setGenPreview(null);
                }}
              />
            </div>

            {genPreview && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="default">作成 {genPreview.counts.toCreate}件</Badge>
                  <Badge variant="secondary">
                    休校スキップ {genPreview.counts.skippedClosure}件
                  </Badge>
                  <Badge variant="outline">
                    重複スキップ {genPreview.counts.skippedDuplicate}件
                  </Badge>
                </div>
                <PreviewList title="作成される授業" items={genPreview.toCreate} />
                <PreviewList
                  title="休校でスキップ"
                  items={genPreview.skippedClosure}
                />
                <PreviewList
                  title="重複でスキップ"
                  items={genPreview.skippedDuplicate}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            {!genPreview ? (
              <Button onClick={runPreview} disabled={generating}>
                {generating ? "取得中..." : "プレビュー"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGenPreview(null)}
                  disabled={generating}
                >
                  月を選び直す
                </Button>
                <Button
                  onClick={confirmGenerate}
                  disabled={generating || genPreview.counts.toCreate === 0}
                >
                  {generating
                    ? "作成中..."
                    : `確定して作成（${genPreview.counts.toCreate}件）`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** プレビュー内訳リスト（0件は非表示）。 */
function PreviewList({
  title,
  items,
}: {
  title: string;
  items: GenPreviewItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{title}</p>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-2 text-xs">
        {items.map((item, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="truncate">
              {item.scheduledAt.replace("T", " ").slice(0, 16)} {item.studentName}
            </span>
            <span className="flex-shrink-0 text-muted-foreground">
              {SESSION_TYPE_LABELS[item.type] ?? item.type} / {item.teacherName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
