"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CheckCircle2, Circle } from "lucide-react";
import { useAuthSWR } from "@/lib/api/swr";
import type { ResearchCurriculum } from "@/lib/types/research";

/**
 * 管理者(講師)が生徒の探究カリキュラム全体を読み取り表示するセクション。
 * カリキュラム未作成の生徒では何も表示しない。編集は生徒主導のため不可(閲覧のみ)。
 */
export function AdminResearchCurriculumSection({ studentId }: { studentId: string }) {
  const { data: curriculum } = useAuthSWR<ResearchCurriculum | null>(
    `/api/admin/students/${studentId}/research-curriculum`
  );

  if (!curriculum) return null;

  const done = curriculum.units.filter((u) => u.status === "done").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          探究カリキュラム
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <p>
            <span className="text-muted-foreground">テーマ:</span>{" "}
            <span className="font-medium">{curriculum.theme}</span>
          </p>
          <p>
            <span className="text-muted-foreground">分野:</span> {curriculum.domain}
          </p>
          <p>
            <span className="text-muted-foreground">ゴール:</span> {curriculum.goal}
          </p>
          <p className="text-muted-foreground">
            進捗: {done} / {curriculum.totalUnits} 回
          </p>
        </div>

        <div className="space-y-2">
          {curriculum.units.map((u) => (
            <div
              key={u.order}
              className={`rounded-md border p-3 ${u.status === "done" ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2 font-medium">
                {u.status === "done" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                第{u.order}回: {u.title}
              </div>
              <div className="mt-1 space-y-0.5 pl-6 text-muted-foreground">
                <p>狙い: {u.aim}</p>
                {u.research.length > 0 && <p>調べること: {u.research.join(" / ")}</p>}
                <p>アウトプット: {u.output}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
