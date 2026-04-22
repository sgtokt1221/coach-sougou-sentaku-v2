"use client";

import { useState } from "react";
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
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { toast } from "sonner";
import type { SessionType, GroupSessionCreateRequest } from "@/lib/types/session";
import { SESSION_TYPE_LABELS } from "@/lib/types/session";
import type { StudentListItem, TeacherListItem } from "@/lib/types/admin";

export default function NewSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [type, setType] = useState<SessionType | "">("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [notes, setNotes] = useState("");
  // Group review specific fields
  const [theme, setTheme] = useState("");
  const [targetWeakness, setTargetWeakness] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");

  const { data: students, isLoading: studentsLoading } =
    useAuthSWR<StudentListItem[]>("/api/admin/students");
  const { data: myTeachers } =
    useAuthSWR<TeacherListItem[]>("/api/admin/teachers");
  const { data: allTeachers, isLoading: teachersLoading } =
    useAuthSWR<TeacherListItem[]>("/api/admin/teachers/all");

  const selectedStudent = students?.find((s) => s.uid === studentId);
  const selectedTeacher = allTeachers?.find((t) => t.uid === teacherId);
  const isExternalTeacher =
    selectedTeacher && !myTeachers?.some((t) => t.uid === teacherId);

  const canSubmit = teacherId && type && scheduledAt &&
    (type !== "group_review" ? studentId : submissionDeadline);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedTeacher) return;
    if (type !== "group_review" && (!selectedStudent)) return;
    setSaving(true);
    try {
      let requestBody: any;

      if (type === "group_review") {
        // Group review session
        const groupRequest: GroupSessionCreateRequest = {
          teacherId,
          teacherName: selectedTeacher.displayName,
          type: "group_review",
          scheduledAt,
          meetLink: meetLink || undefined,
          notes: notes || undefined,
          theme: theme || undefined,
          targetWeakness: targetWeakness || undefined,
          submissionDeadline,
          maxParticipants: 10, // Default value
          participantIds: [], // Empty initially
        };
        requestBody = groupRequest;
      } else {
        // Regular session
        requestBody = {
          teacherId,
          studentId,
          teacherName: selectedTeacher.displayName,
          studentName: selectedStudent!.displayName,
          type,
          scheduledAt,
          meetLink: meetLink || undefined,
          notes: notes || undefined,
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
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
              {type !== "group_review" && (
                <div className="space-y-2">
                  <Label htmlFor="student">生徒</Label>
                  {studentsLoading ? (
                    <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      読み込み中...
                    </div>
                  ) : (
                    <Select value={studentId} onValueChange={(v) => setStudentId(v ?? "")}>
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
                  <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : (
                  <Select value={teacherId} onValueChange={(v) => setTeacherId(v ?? "")}>
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
                <UserPlus className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
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
                  value={type}
                  onValueChange={(v: string | null) =>
                    setType((v ?? "") as SessionType | "")
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(SESSION_TYPE_LABELS) as [
                        SessionType,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Group review specific fields */}
            {type === "group_review" && (
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

            <div className="space-y-2">
              <Label htmlFor="meetLink">Google Meetリンク (任意)</Label>
              <Input
                id="meetLink"
                placeholder="https://meet.google.com/..."
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">メモ (任意)</Label>
              <textarea
                id="notes"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Save className="size-4 mr-2" />
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
