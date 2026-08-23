"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, PenLine } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type { RawCorrection } from "@/lib/sentence-drill/personal";
import type { SentenceRewriteJudge } from "@/lib/ai/schemas/sentence-rewrite";

/**
 * 「あなたの答案から」ラウンド。自分が実際に書いた文を、自分で直す。
 *
 * 4択と違い、全部書いてからまとめて判定する（AI呼び出しを1回に抑えるため）。
 * 判定を待つ間があるので、静的ドリルの後ろに置いている。
 */
export function PersonalRewriteRound({
  lectureId,
  items,
  onFinish,
  onOverall,
}: {
  lectureId: string;
  items: RawCorrection[];
  onFinish: () => void;
  /** 判定で見えた癖を親へ渡す（このあとの課題でコーチが使う） */
  onOverall?: (overall: string) => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => items.map(() => ""));
  const [judging, setJudging] = useState(false);
  const [judge, setJudge] = useState<SentenceRewriteJudge | null>(null);

  const allFilled = answers.every((a) => a.trim().length > 0);

  async function submit() {
    setJudging(true);
    try {
      const res = await authFetch("/api/essay/lecture/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          items: items.map((correction, i) => ({
            correction,
            answer: answers[i].trim(),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "判定に失敗しました");
        return;
      }
      const judged = data as SentenceRewriteJudge;
      setJudge(judged);
      if (judged.overall) onOverall?.(judged.overall);
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setJudging(false);
    }
  }

  if (judge) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4" />
          あなたの答案からの直し
        </h2>
        {items.map((item, i) => {
          const r = judge.results.find((x) => x.index === i);
          return (
            <div
              key={i}
              className="bg-card space-y-2 rounded-xl border p-4 sm:p-5"
            >
              <p className="text-muted-foreground text-sm line-through">
                {item.original}
              </p>
              <p className="text-[1.05rem] leading-relaxed">{answers[i]}</p>
              {r && (
                <div className="flex items-start gap-2 pt-1 text-xs">
                  {r.ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  )}
                  <div className="space-y-1">
                    <p>{r.comment}</p>
                    {r.betterExample && (
                      <p className="text-muted-foreground">
                        直し方の例: {r.betterExample}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {judge.overall && (
          <p className="bg-muted/60 rounded-lg p-3 text-sm">{judge.overall}</p>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={onFinish}>
            課題へ進む
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <PenLine className="size-4" />
          あなたの答案から
        </h2>
        <p className="text-muted-foreground text-xs">
          これまでの添削で指摘された、あなた自身の文です。自分で直してみましょう。
        </p>
      </div>

      {items.map((item, i) => (
        <div
          key={i}
          className="bg-muted/40 space-y-3 rounded-xl border p-4 sm:p-5"
        >
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold">
              あなたが書いた文
            </p>
            <p className="text-[1.05rem] leading-relaxed">{item.original}</p>
          </div>

          <div className="flex gap-2 border-l-2 border-amber-300 pl-3">
            <span className="text-muted-foreground shrink-0 text-xs font-semibold">
              指摘
            </span>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {item.reason}
            </p>
          </div>

          {/* 書く場所は白にする。周りを淡く沈めて、ここに入力すると分かるようにする */}
          <Textarea
            value={answers[i]}
            onChange={(e) =>
              setAnswers((prev) =>
                prev.map((a, j) => (j === i ? e.target.value : a))
              )
            }
            placeholder="直した文を書いてください"
            className="bg-card min-h-24 rounded-lg p-3.5 text-base shadow-sm"
          />
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onFinish}>
          とばす
        </Button>
        <div className="flex items-center gap-3">
          {!allFilled && (
            <span className="text-muted-foreground text-xs">
              {answers.filter((a) => a.trim()).length} / {items.length} 記入
            </span>
          )}
          <Button onClick={submit} disabled={!allFilled || judging}>
            {judging ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                判定中...
              </>
            ) : (
              "判定する"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
