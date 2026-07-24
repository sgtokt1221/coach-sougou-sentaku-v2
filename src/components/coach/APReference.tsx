"use client";

import { useAuthSWR } from "@/lib/api/swr";
import type { University } from "@/lib/types/university";

/**
 * 志望校・学部のアドミッション・ポリシー(AP)を表示する参照タブ。
 *
 * 小論文添削コーチ(EssayCoachPanel)と出願書類コーチ(DocumentSectionCoachPanel)で
 * 共通利用する。universityId / facultyId から大学データを取得し、該当学部の
 * admissionPolicy を表示する。
 */
export function APReference({
  universityId,
  facultyId,
}: {
  universityId?: string;
  facultyId?: string;
}) {
  const { data, isLoading } = useAuthSWR<University>(
    universityId ? `/api/universities/${universityId}` : null,
  );

  if (!universityId || !facultyId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        志望校・学部が選択されていません。上部の志望校選択から選んでください。
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  const faculty = data?.faculties?.find((f) => f.id === facultyId);
  if (!faculty) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        学部情報が見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">志望校・学部</div>
        <div className="text-sm font-semibold">
          {data?.name} {faculty.name}
        </div>
      </div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        アドミッション・ポリシー
      </div>
      {faculty.admissionPolicy ? (
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
          {faculty.admissionPolicy}
        </pre>
      ) : (
        <div className="text-sm text-muted-foreground">AP は登録されていません。</div>
      )}
    </div>
  );
}
