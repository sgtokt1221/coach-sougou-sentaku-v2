"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Sparkles, Lock, CheckCircle2, Circle } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { useRouter } from "next/navigation";
import type { ResearchCurriculum } from "@/lib/types/research";

/**
 * 自己探究ハブ（生徒・閲覧専用）。
 * 分野決めの問答は探究セッション画面で、カリキュラム生成・編集は講師が行う。
 * ここではカリキュラムの状態を確認できる。
 */
export default function ResearchHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(true);
  const [curriculum, setCurriculum] = useState<ResearchCurriculum | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/research/curriculum");
        if (res.status === 403) {
          setEnrolled(false);
          return;
        }
        if (res.ok) setCurriculum(await res.json());
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!enrolled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Lock}
              title="自己探究は受講登録が必要です"
              description="受講をご希望の場合は教室にお問い合わせください"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = curriculum?.status === "active";
  const isDraft = curriculum?.status === "draft";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-primary" />
        <h1 className="text-xl font-bold">自己探究</h1>
      </div>

      {!curriculum && (
        <Card>
          <CardContent className="space-y-2 py-8 text-center text-sm text-muted-foreground">
            <p>初回の探究授業で、先生と一緒にAIと相談して探究分野を決め、カリキュラムを作成します。</p>
            <Button variant="outline" size="sm" onClick={() => router.push("/student/sessions")}>
              面談記録を見る
            </Button>
          </CardContent>
        </Card>
      )}

      {isDraft && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardHeader>
            <CardTitle className="text-base">探究テーマ（決定済み）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">分野:</span> {curriculum?.domain}
            </p>
            <p>
              <span className="text-muted-foreground">テーマ:</span> {curriculum?.theme}
            </p>
            <p>
              <span className="text-muted-foreground">ゴール:</span> {curriculum?.goal}
            </p>
            <p className="text-muted-foreground">先生が授業でカリキュラムを作成します。</p>
          </CardContent>
        </Card>
      )}

      {isActive && curriculum && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{curriculum.theme}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">分野:</span> {curriculum.domain}
              </p>
              <p>
                <span className="text-muted-foreground">ゴール:</span> {curriculum.goal}
              </p>
              <p className="text-muted-foreground">
                進捗: {curriculum.units.filter((u) => u.status === "done").length} / {curriculum.totalUnits} 回
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {curriculum.units.map((u) => (
              <Card key={u.order} className={u.status === "done" ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {u.status === "done" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    第{u.order}回: {u.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">狙い:</span> {u.aim}
                  </p>
                  {u.research.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">調べること:</span>
                      <ul className="list-disc space-y-0.5 pl-5">
                        {u.research.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p>
                    <span className="text-muted-foreground">教えるアウトプット:</span> {u.output}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
