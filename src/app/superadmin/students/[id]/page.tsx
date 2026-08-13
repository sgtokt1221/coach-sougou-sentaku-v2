"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Mic, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CategoryAverageRadar } from "@/components/admin/CategoryAverageRadar";
import { SkillRankBadge } from "@/components/skill-check/SkillRankBadge";
import { scoreToSkillRank } from "@/lib/history-rank";
import { getInitials } from "@/lib/utils/avatar";
import { useAuthSWR } from "@/lib/api/swr";
import type { StudentDetail } from "@/lib/types/admin";

/**
 * スーパー管理者用の生徒詳細（読み取り専用）。
 *
 * 管理者画面へ入る導線を廃止したため、スーパー管理者が生徒の中身を
 * 確認する場所が無くなっていた。担当を横断して見るための画面なので、
 * コメント送信や編集など「担当者としての操作」は置かない。
 */
export default function SuperadminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useAuthSWR<StudentDetail>(
    `/api/admin/students/${id}`,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-muted-foreground text-sm">
          生徒データを取得できませんでした
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          戻る
        </Button>
      </div>
    );
  }

  const p = data.profile;
  const essays = data.essays ?? [];
  const weaknesses = (data.weaknesses ?? []).filter((w) => !w.resolved);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 lg:py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <Avatar size="sm">
          <AvatarImage src={p.photoURL ?? undefined} alt={p.displayName} />
          <AvatarFallback>{getInitials(p.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{p.displayName}</h1>
          <p className="text-muted-foreground truncate text-xs">{p.email}</p>
        </div>
      </div>

      {/* 担当・所属。スーパー管理者はここを見て塾を跨ぐ判断をする */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            所属・基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="塾" value={p.organizationId ?? "未所属"} />
          <Row
            label="学年"
            value={p.grade ? `高${p.grade}` : p.isRonin ? "浪人" : "未設定"}
          />
          <Row label="高校" value={p.school ?? "未設定"} />
          <Row label="GPA" value={p.gpa != null ? String(p.gpa) : "未設定"} />
          <Row
            label="志望校"
            value={
              (p.resolvedUniversities ?? []).length > 0
                ? p
                    .resolvedUniversities!.map(
                      (u) => `${u.universityName} ${u.facultyName}`,
                    )
                    .join(" / ")
                : "未設定"
            }
          />
          <Row
            label="加入"
            value={
              p.createdAt
                ? new Date(p.createdAt).toLocaleDateString("ja-JP")
                : "不明"
            }
          />
        </CardContent>
      </Card>

      {/* 項目別平均。未評価の軸は描かれない */}
      <CategoryAverageRadar
        essayAverages={data.essayCategoryAverages}
        interviewAverages={data.interviewCategoryAverages}
        essayCount={essays.length}
        interviewCount={data.interviewScoreTrend?.length}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            添削履歴
            <Badge variant="secondary" className="ml-1 text-xs">
              {essays.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {essays.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              添削履歴なし
            </p>
          ) : (
            <div className="space-y-2">
              {essays.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {e.targetUniversity} {e.targetFaculty}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {e.topic || "テーマ未記録"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(e.submittedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  {e.scores ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <SkillRankBadge
                        rank={scoreToSkillRank(
                          e.scores.total,
                          e.scoreMaximum ?? 50,
                        )}
                        size="sm"
                        animate={false}
                      />
                      <div className="text-right">
                        <p className="text-lg font-bold">{e.scores.total}</p>
                        <p className="text-muted-foreground text-xs">
                          /{e.scoreMaximum ?? 50}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      未採点
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="size-4" />
            面接履歴
            <Badge variant="secondary" className="ml-1 text-xs">
              {data.interviewScoreTrend?.length ?? 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.interviewScoreTrend?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              面接履歴なし
            </p>
          ) : (
            <div className="space-y-2">
              {data.interviewScoreTrend!.map((iv, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(iv.date).toLocaleDateString("ja-JP")}
                  </span>
                  <span className="font-semibold">
                    {iv.total}
                    <span className="text-muted-foreground text-xs">/40</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-4" />
            未解決の弱点
            <Badge variant="secondary" className="ml-1 text-xs">
              {weaknesses.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weaknesses.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              未解決の弱点はありません
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {weaknesses.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{w.area}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {w.count}回
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  );
}
