"use client";

import { useEffect, useState } from "react";
import type { FeedbackAnchors } from "@/lib/types/essay";

/**
 * 答案の指摘を本文に結び付けた結果を用意する。
 *
 * 保存済み（AI で補ったもの）があればそれを使い、無ければ /api/essay/[id]/anchors で
 * 裏で作る（初回だけ AI を呼んで保存される）。作れるまでは null を返すので、
 * 呼び出し側は計算で決まる分だけで先に表示する（useAnchoredFeedback が補う）。
 * 生徒の結果画面と、管理者・講師の答案ダイアログで共用する。
 */
export function useEssayFeedbackAnchors(
  essayId: string | null | undefined,
  saved: FeedbackAnchors | null | undefined
): { anchors: FeedbackAnchors | null; pending: boolean } {
  const [anchors, setAnchors] = useState<FeedbackAnchors | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAnchors(null);
    if (!essayId) return;
    if (saved?.judged) {
      setAnchors(saved);
      return;
    }
    let alive = true;
    setPending(true);
    (async () => {
      try {
        const [{ authFetch }, { auth }] = await Promise.all([
          import("@/lib/api/client"),
          import("@/lib/firebase/config"),
        ]);
        // ページを直接開いた直後は、ログイン状態の復元を待たないとトークン無しで弾かれる
        await auth?.authStateReady();
        const res = await authFetch(`/api/essay/${essayId}/anchors`, {
          method: "POST",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          feedbackAnchors?: FeedbackAnchors;
        };
        if (alive && data.feedbackAnchors) setAnchors(data.feedbackAnchors);
      } catch {
        // 作れなくても計算で決まる分だけで表示する
      } finally {
        if (alive) setPending(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [essayId, saved]);

  return { anchors, pending: pending && !anchors };
}
