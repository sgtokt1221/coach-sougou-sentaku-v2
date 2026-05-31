"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserCog, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import type { TeacherListItem } from "@/lib/types/admin";

const UNASSIGNED = "__none__";

/**
 * 管理者の生徒詳細「メッセージ」タブ。
 * - 担当講師(assignedTeacherId)の割り当て/解除
 * - 生徒↔講師スレッドの読み取り専用モニタ(監視)
 */
export function TeacherAssignmentSection({
  studentId,
  studentName,
  initialAssignedTeacherId,
}: {
  studentId: string;
  studentName: string;
  initialAssignedTeacherId?: string;
}) {
  const { userProfile } = useAuth();
  // 担当講師の割当は管理者専用。講師が閲覧している場合はセレクタを出さない。
  const canAssign = userProfile?.role !== "teacher";
  const { data: teachers } = useAuthSWR<TeacherListItem[]>(
    canAssign ? "/api/admin/teachers" : null
  );
  const [assignedTeacherId, setAssignedTeacherId] = useState<string | undefined>(
    initialAssignedTeacherId
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAssignedTeacherId(initialAssignedTeacherId);
  }, [initialAssignedTeacherId]);

  async function handleChange(value: string) {
    const teacherId = value === UNASSIGNED ? null : value;
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/assign-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "割り当てに失敗しました");
      }
      setAssignedTeacherId(teacherId ?? undefined);
      toast.success(teacherId ? "担当講師を割り当てました" : "担当講師を解除しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "割り当てに失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {canAssign && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4" />
              担当講師
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={assignedTeacherId ?? UNASSIGNED}
                onValueChange={(v) => handleChange(v ?? UNASSIGNED)}
                disabled={saving}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="講師を選択">
                    {(value: string) =>
                      value === UNASSIGNED
                        ? "未割当"
                        : (teachers ?? []).find((t) => t.uid === value)
                            ?.displayName ?? "講師を選択"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>未割当</SelectItem>
                  {(teachers ?? []).map((t) => (
                    <SelectItem key={t.uid} value={t.uid}>
                      {t.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">
              割り当てると、生徒の「講師」タブで担当講師とメッセージできるようになります。
            </p>
          </CardContent>
        </Card>
      )}

      {assignedTeacherId ? (
        <TeacherThreadMonitor studentId={studentId} studentName={studentName} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            担当講師を割り当てると、ここに生徒↔講師のやりとりが表示されます。
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 生徒↔講師スレッドの読み取り専用モニタ (管理者の監視用) */
function TeacherThreadMonitor({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { messages, loading } = useFeedbackThread(studentId, {
    subcollection: "teacherFeedback",
  });

  // 読み取り専用: 送信は行わない (disabled でコンポーザー非表示)
  const noop = async () => {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="size-4" />
          講師とのやりとり（閲覧のみ）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[60vh] overflow-hidden rounded-lg border bg-card px-3">
          <ChatThread
            messages={messages}
            currentRole="coach"
            onSend={noop}
            loading={loading}
            disabled
            otherName={studentName}
            emptyText="生徒と講師のメッセージがここに表示されます"
          />
        </div>
      </CardContent>
    </Card>
  );
}
