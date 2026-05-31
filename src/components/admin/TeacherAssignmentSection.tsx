"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCog, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { authFetch } from "@/lib/api/client";
import { useAuthSWR } from "@/lib/api/swr";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedbackThread } from "@/lib/hooks/useFeedbackThread";
import { ChatThread } from "@/components/chat/ChatThread";
import type { TeacherListItem } from "@/lib/types/admin";

/**
 * 管理者の生徒詳細「メッセージ」タブ。
 * - 担当講師(assignedTeacherIds)の複数割り当て/解除
 * - 生徒↔講師スレッドの読み取り専用モニタ(監視)
 */
export function TeacherAssignmentSection({
  studentId,
  studentName,
  initialAssignedTeacherIds,
}: {
  studentId: string;
  studentName: string;
  initialAssignedTeacherIds?: string[];
}) {
  const { userProfile } = useAuth();
  // 担当講師の割当は管理者専用。講師が閲覧している場合はセレクタを出さない。
  const canAssign = userProfile?.role !== "teacher";
  const { data: teachers } = useAuthSWR<TeacherListItem[]>(
    canAssign ? "/api/admin/teachers" : null
  );
  const [assigned, setAssigned] = useState<string[]>(
    initialAssignedTeacherIds ?? []
  );
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    setAssigned(initialAssignedTeacherIds ?? []);
  }, [initialAssignedTeacherIds]);

  async function toggle(teacherId: string, assign: boolean) {
    setSavingUid(teacherId);
    try {
      const res = await authFetch(
        `/api/admin/students/${studentId}/assign-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId, assigned: assign }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "割り当てに失敗しました");
      }
      const data = (await res.json()) as { assignedTeacherIds?: string[] };
      setAssigned(data.assignedTeacherIds ?? []);
      toast.success(assign ? "担当講師を割り当てました" : "担当講師を解除しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "割り当てに失敗しました");
    } finally {
      setSavingUid(null);
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
            <p className="text-xs text-muted-foreground">
              複数の講師を割り当てられます。割り当てた講師は学習状況の閲覧と、生徒の「講師」タブでのメッセージができます。
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {(teachers ?? []).length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                割り当て可能な講師がいません。
              </p>
            ) : (
              (teachers ?? []).map((t) => {
                const isOn = assigned.includes(t.uid);
                return (
                  <div
                    key={t.uid}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="truncate text-sm font-medium">
                      {t.displayName}
                    </span>
                    <Switch
                      checked={isOn}
                      disabled={savingUid === t.uid}
                      onCheckedChange={(c) => toggle(t.uid, c)}
                      aria-label={`${t.displayName} を担当に`}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {assigned.length > 0 ? (
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
