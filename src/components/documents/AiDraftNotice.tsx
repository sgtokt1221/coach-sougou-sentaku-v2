"use client";

import { AlertTriangle } from "lucide-react";

/**
 * AIが書いた本文であることの注意書き。
 *
 * 出願書類はそのまま提出される。小論文コーチの見本には「これは例です。
 * 自分の言葉に直してから使ってください」という一文を必ず添えているのに、
 * 書類側にはどこにも出ていなかった。
 *
 * あわせて、Anthropic は2026年8月から生成テキストに機械可読な印を付ける
 * 仕組みを導入している（現時点で対応しているのは新しいモデルのみだが、
 * 既存モデルにも順次入る）。AIが書いた文をそのまま出すことの意味が
 * 変わりうるため、生徒が知らないまま提出しないようにする。
 */
export function AiDraftNotice({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 ${className}`}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        AIが書いた下書きです。<strong>このまま提出しないでください。</strong>
        自分の経験と言葉に置き換えてから使います。生成された文には、AIが書いた
        ことを示す印が含まれる場合があります。
      </span>
    </p>
  );
}
