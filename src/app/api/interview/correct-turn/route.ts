import { NextRequest, NextResponse } from "next/server";
import { correctTranscriptTurn } from "@/lib/ai/transcript-correct";

/**
 * 音声面接の文字起こし1発言を Claude(Haiku) で誤変換補正する軽量ルート。
 *
 * クライアント（session ページ）が発言確定ごとに呼び、返ってきた `corrected` で
 * 「認識中…」バブルを差し替える。**面接を止めないのが最優先**のため、失敗時も
 * 200 で原文（`corrected: text`）を返す。
 */
export async function POST(request: NextRequest) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json({ corrected: text });
    }

    // コスト集計用に uid をベストエフォートで取得（失敗しても補正は続行）
    let uid: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { adminAuth } = await import("@/lib/firebase/admin");
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
          uid = decoded.uid;
        }
      } catch {}
    }

    const corrected = await correctTranscriptTurn(text, {
      lastAiQuestion: typeof body.lastAiQuestion === "string" ? body.lastAiQuestion : undefined,
      universityName: typeof body.universityName === "string" ? body.universityName : undefined,
      facultyName: typeof body.facultyName === "string" ? body.facultyName : undefined,
      studentName: typeof body.studentName === "string" ? body.studentName : undefined,
      highSchoolName: typeof body.highSchoolName === "string" ? body.highSchoolName : undefined,
      uid,
    });

    return NextResponse.json({ corrected });
  } catch {
    // 解析失敗等でも原文を返してクライアントを止めない
    return NextResponse.json({ corrected: text });
  }
}
