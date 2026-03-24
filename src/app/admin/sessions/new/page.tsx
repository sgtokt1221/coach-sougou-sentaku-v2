"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import type { SessionType } from "@/lib/types/session";
import { SESSION_TYPE_LABELS } from "@/lib/types/session";

export default function NewSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [type, setType] = useState<SessionType | "">("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = studentName && teacherName && type && scheduledAt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: "teacher-1",
          studentId: "student-1",
          teacherName,
          studentName,
          type,
          scheduledAt,
          meetLink: meetLink || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin/sessions");
    } catch {
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
              <div className="space-y-2">
                <Label htmlFor="studentName">生徒名</Label>
                <Input
                  id="studentName"
                  placeholder="例: 田中太郎"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherName">講師名</Label>
                <Input
                  id="teacherName"
                  placeholder="例: 山田先生"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>
            </div>

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
                <Save className="size-4 mr-2" />
                {saving ? "保存中..." : "作成"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
