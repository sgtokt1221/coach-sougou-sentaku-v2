"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import type { OralExamKnowledgeDigest } from "@/lib/types/essay";

/**
 * 口頭試問型の「知識の整理」。テーマ深掘り（EssayDeepDiveView）の代わりに出す。
 *
 * 深掘りの「対立している論点・主な立場」は意見を書く小論文向けで、知識を問う
 * 口頭試問では役に立たない。用語の定義・事実・取り違えやすい点・問ごとに外せないことを出す。
 */
export function OralExamKnowledgeDigestView({
  digest,
  generating,
  onGenerate,
}: {
  digest?: OralExamKnowledgeDigest;
  generating: boolean;
  onGenerate: () => void;
}) {
  if (!digest) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="bg-primary/10 mb-4 inline-flex size-14 items-center justify-center rounded-full">
            <Sparkles className="text-primary size-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            このテーマの知識を整理する
          </h3>
          <p className="text-muted-foreground mx-auto mb-5 max-w-md text-sm leading-relaxed">
            定義を言えるようにしておく用語、知っておくべき事実、取り違えやすい点、
            問ごとに答えで外せないことをまとめます。一度作ると保存されます。
          </p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                作成中…（1分ほどかかります）
              </>
            ) : (
              <>
                <BookOpen className="mr-2 size-4" />
                知識を整理する
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="text-primary size-5" />
            知識の整理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Body>{digest.summary}</Body>
        </CardContent>
      </Card>

      {digest.terms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              定義を言えるようにする用語
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {digest.terms.map((t, i) => (
              <div key={i} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="font-semibold">{t.term}</p>
                <Body>{t.definition}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {digest.keyPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">知っておくべきこと</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {digest.keyPoints.map((k, i) => (
              <div key={i} className="space-y-1">
                <p className="font-semibold">{k.point}</p>
                <Body>{k.detail}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {digest.misconceptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">取り違えやすいこと</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {digest.misconceptions.map((m, i) => (
              <div key={i} className="space-y-1.5">
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  × {m.wrong}
                </p>
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                  ○ {m.right}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {digest.perQuestion.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">問ごとに外せないこと</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {digest.perQuestion.map((p) => (
              <div key={p.no} className="flex gap-3">
                <span className="bg-primary text-primary-foreground inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold">
                  問{p.no}
                </span>
                <Body>{p.mustInclude}</Body>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
      {children}
    </p>
  );
}
