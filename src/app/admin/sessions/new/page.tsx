"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  UserPlus,
  Video,
  MapPin,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type {
  SessionKind,
  GroupSessionCreateRequest,
} from "@/lib/types/session";
import {
  SESSION_KIND_LABELS,
  SESSION_KIND_DESCRIPTIONS,
  SESSION_KIND_CREATE_OPTIONS,
  kindToTypeResearch,
} from "@/lib/types/session";
import type { StudentListItem, TeacherListItem } from "@/lib/types/admin";

export default function NewSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [kind, setKind] = useState<SessionKind | "">("");
  const [format, setFormat] = useState<"online" | "offline">("offline");
  const [scheduledAt, setScheduledAt] = useState("");
  const [autoCalendar, setAutoCalendar] = useState(true);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    authFetch("/api/admin/google/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        const connected = data?.connected === true;
        setGoogleConnected(connected);
        if (!connected) setAutoCalendar(false);
      })
      .catch(() => {
        if (alive) setGoogleConnected(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const [notes, setNotes] = useState("");
  // Group review specific fields
  const [theme, setTheme] = useState("");
  const [targetWeakness, setTargetWeakness] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");

  const { data: students, isLoading: studentsLoading } = useAuthSWR<
    StudentListItem[]
  >("/api/admin/students");
  const { data: myTeachers } = useAuthSWR<TeacherListItem[]>(
    "/api/admin/teachers"
  );
  const { data: allTeachers, isLoading: teachersLoading } = useAuthSWR<
    TeacherListItem[]
  >("/api/admin/teachers/all");

  const selectedStudent = students?.find((s) => s.uid === studentId);
  const selectedTeacher = allTeachers?.find((t) => t.uid === teacherId);
  const isExternalTeacher =
    selectedTeacher && !myTeachers?.some((t) => t.uid === teacherId);

  const canSubmit =
    teacherId &&
    kind &&
    scheduledAt &&
    (kind !== "group_review" ? studentId : submissionDeadline);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedTeacher) return;
    if (kind !== "group_review" && !selectedStudent) return;
    setSaving(true);
    try {
      let requestBody: any;

      if (kind === "group_review") {
        // Group review session
        const groupRequest: GroupSessionCreateRequest = {
          teacherId,
          teacherName: selectedTeacher.displayName,
          type: "group_review",
          scheduledAt,
          notes: notes || undefined,
          theme: theme || undefined,
          targetWeakness: targetWeakness || undefined,
          submissionDeadline,
          maxParticipants: 10, // Default value
          participantIds: [], // Empty initially
        };
        requestBody = groupRequest;
      } else {
        // Regular session (kind → 保存用の type/isResearch へ射影)
        const { type, isResearch } = kindToTypeResearch(kind);
        requestBody = {
          teacherId,
          studentId,
          teacherName: selectedTeacher.displayName,
          studentName: selectedStudent!.displayName,
          type,
          format,
          scheduledAt,
          notes: notes || undefined,
          isResearch,
        };
      }

      const res = await authFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "作成に失敗しました");
      }
      const created = (await res.json()) as { id: string };

      // Calendar event 自動作成 (オンライン + トグル ON + 連携済み + 1 対 1 のみ)
      if (
        format === "online" &&
        autoCalendar &&
        googleConnected &&
        kind !== "group_review" &&
        created.id
      ) {
        try {
          const ev = await authFetch(
            `/api/admin/sessions/${created.id}/calendar-event`,
            { method: "POST" }
          );
          if (!ev.ok) {
            const errData = await ev.json().catch(() => ({}));
            toast.warning(
              errData.error ??
                "Calendar 連携に失敗しましたが、セッションは作成されました"
            );
          }
        } catch (err) {
          console.warn("[calendar] auto create failed:", err);
          toast.warning(
            "Calendar 連携に失敗しましたが、セッションは作成されました"
          );
        }
      }

      toast.success("セッションを作成しました");
      router.push("/admin/sessions");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "セッション作成に失敗しました"
      );
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">新規セッション作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">セッション情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {kind !== "group_review" && (
                <div className="space-y-2">
                  <Label htmlFor="student">生徒</Label>
                  {studentsLoading ? (
                    <div className="text-muted-foreground flex h-10 items-center gap-2 text-sm">
                      <Loader2 className="size-4 animate-spin" />
                      読み込み中...
                    </div>
                  ) : (
                    <Select
                      value={studentId}
                      onValueChange={(v) => setStudentId(v ?? "")}
                    >
                      <SelectTrigger id="student">
                        <SelectValue placeholder="生徒を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {(students ?? []).map((s) => (
                          <SelectItem key={s.uid} value={s.uid}>
                            {s.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="teacher">講師</Label>
                {teachersLoading ? (
                  <div className="text-muted-foreground flex h-10 items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : (
                  <Select
                    value={teacherId}
                    onValueChange={(v) => setTeacherId(v ?? "")}
                  >
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder="講師を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {(allTeachers ?? []).map((t) => {
                        const isExternal = !myTeachers?.some(
                          (mt) => mt.uid === t.uid
                        );
                        return (
                          <SelectItem key={t.uid} value={t.uid}>
                            {t.displayName}
                            {isExternal ? " (外部)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {isExternalTeacher && (
              <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-800 dark:bg-sky-950/30">
                <UserPlus className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <p className="text-xs text-sky-700 dark:text-sky-300">
                  <Badge variant="secondary" className="mr-1.5">
                    外部講師
                  </Badge>
                  {selectedTeacher.displayName}
                  はこのセッションのみ生徒データにアクセスできます
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">セッションタイプ</Label>
                <Select
                  value={kind}
                  onValueChange={(v: string | null) =>
                    setKind((v ?? "") as SessionKind | "")
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...SESSION_KIND_CREATE_OPTIONS,
                      "group_review" as const,
                    ].map((key) => (
                      <SelectItem key={key} value={key}>
                        {SESSION_KIND_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {kind && (
                  <p className="text-muted-foreground text-xs">
                    {SESSION_KIND_DESCRIPTIONS[kind]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">日時</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            {/* 授業形態 (1 対 1 のみ) */}
            {kind !== "group_review" && (
              <div className="space-y-2">
                <Label>授業形態</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={format === "offline" ? "default" : "outline"}
                    onClick={() => setFormat("offline")}
                    className="flex-1"
                  >
                    <MapPin className="mr-1 size-4" />
                    対面
                  </Button>
                  <Button
                    type="button"
                    variant={format === "online" ? "default" : "outline"}
                    onClick={() => setFormat("online")}
                    className="flex-1"
                  >
                    <Video className="mr-1 size-4" />
                    オンライン
                  </Button>
                </div>
              </div>
            )}

            {/* Group review specific fields */}
            {kind === "group_review" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme">テーマ (任意)</Label>
                    <Input
                      id="theme"
                      placeholder="添削テーマを入力..."
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetWeakness">対象の弱点 (任意)</Label>
                    <Input
                      id="targetWeakness"
                      placeholder="論理的一貫性など..."
                      value={targetWeakness}
                      onChange={(e) => setTargetWeakness(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submissionDeadline">小論文提出期限 *</Label>
                  <Input
                    id="submissionDeadline"
                    type="datetime-local"
                    value={submissionDeadline}
                    onChange={(e) => setSubmissionDeadline(e.target.value)}
                  />
                </div>
              </>
            )}

            {kind !== "group_review" &&
              format === "online" &&
              googleConnected && (
                <div className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-900 dark:bg-teal-950/30">
                  <div className="flex-1">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoCalendar}
                        onChange={(e) => setAutoCalendar(e.target.checked)}
                        className="size-4 cursor-pointer rounded"
                      />
                      <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                        Google Calendar + Meet を自動作成
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-teal-700/80 dark:text-teal-300/80">
                      イベント作成 + Meet リンク発行 +
                      生徒へのゲスト招待を自動で行います
                    </p>
                  </div>
                </div>
              )}

            {kind !== "group_review" &&
              format === "online" &&
              googleConnected === false && (
                <div className="bg-muted/40 flex items-start gap-2 rounded-lg border p-3">
                  <div className="text-muted-foreground flex-1 text-xs">
                    <Link
                      href="/admin/settings"
                      className="text-primary font-medium hover:underline"
                    >
                      Google Calendar を連携
                    </Link>
                    すると、Meet リンクの発行とカレンダー登録が自動化されます。
                  </div>
                </div>
              )}

            <div className="space-y-2">
              <Label htmlFor="notes">メモ (任意)</Label>
              <textarea
                id="notes"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-20 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                placeholder="セッションに関するメモ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!canSubmit || saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {saving ? "保存中..." : "作成"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
