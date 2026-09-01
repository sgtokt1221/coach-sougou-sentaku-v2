"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, PenLine, CornerDownLeft } from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { toast } from "sonner";
import type {
  SelfWriteItem,
  SelfWriteJudge,
  SelfWriteMode,
} from "@/lib/types/document-selfwrite";

/**
 * 示された要素（または指摘）を見て、本人が自分の言葉で書く欄。
 *
 * AIが書いた文をそのまま本文へ入れると、最終稿にAI由来の文字列が残る。
 * 生成テキストには機械可読な印が付く方向に進んでおり、部分的に手を入れても
 * 消えるとは限らない。だからAIは材料と指摘まで、本文の文字は本人が打つ。
 *
 * 判定は「模範文と一致するか」では見ない。示した要素が入っているか、
 * 示した指摘が解消したかだけを見る（小論文講座の書き直しと同じ考え方）。
 */
export function SelfWriteBox({
  mode,
  target,
  items,
  originalText,
  onAccept,
  acceptLabel,
}: {
  mode: SelfWriteMode;
  target: string;
  items: SelfWriteItem[];
  /** fixes のとき、直す前の本文 */
  originalText?: string;
  /** 判定を通った本人の文を受け取る */
  onAccept: (text: string) => void;
  acceptLabel: string;
}) {
  const [text, setText] = useState("");
  const [judging, setJudging] = useState(false);
  const [judge, setJudge] = useState<SelfWriteJudge | null>(null);

  async function check() {
    if (!text.trim()) return;
    setJudging(true);
    try {
      const res = await authFetch("/api/documents/self-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          target,
          items,
          studentText: text,
          originalText,
        }),
      });
      if (!res.ok) throw new Error();
      setJudge((await res.json()) as SelfWriteJudge);
    } catch {
      toast.error("確認に失敗しました");
    } finally {
      setJudging(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border-2 border-teal-200 bg-teal-50 p-3 dark:border-teal-900 dark:bg-teal-950">
      <div className="flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300">
        <PenLine className="size-3.5" />
        {mode === "elements" ? "この段落に入れること" : "直すところ"}
      </div>

      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-xs">
            <span className="text-muted-foreground shrink-0">
              {judge ? (
                judge.items[i]?.ok ? (
                  <Check className="mt-0.5 size-3.5 text-emerald-600" />
                ) : (
                  <X className="mt-0.5 size-3.5 text-rose-600" />
                )
              ) : (
                "・"
              )}
            </span>
            <span>
              <span className="text-foreground/90">{it.label}</span>
              {judge?.items[i] && (
                <span
                  className={`ml-1 ${judge.items[i].ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}
                >
                  {judge.items[i].comment}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-[11px]">
        これを見て、自分の言葉で書いてください。例文は出しません。
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ここに自分の言葉で書く"
        rows={5}
        className="bg-background resize-y text-sm"
      />

      {judge && (
        <p className="text-foreground/80 text-xs leading-relaxed">
          {judge.overall}
        </p>
      )}

      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={judging || !text.trim()}
          onClick={check}
        >
          {judging ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {judging ? "確認中..." : "書けたか確認"}
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1 text-xs"
          disabled={!text.trim()}
          onClick={() => onAccept(text.trim())}
        >
          <CornerDownLeft className="size-3.5" />
          {acceptLabel}
        </Button>
      </div>
    </div>
  );
}
