/**
 * 管理者が個別生徒の AI 適合度診断 (compute-fit) 結果を閲覧するための API。
 *
 * 生徒が `/student/universities` で「適合度を診断する」 ボタンを押した時に
 * `users/{uid}/matchingCache/latest` に保存される MatchResult[] を、 管理者画面で
 * 参照するだけ。 Claude / OpenAI API は **一切叩かない** (= 追加コスト 0)。
 *
 * - キャッシュあり → そのまま返す
 * - キャッシュなし → { results: null, source: "none" } を返す (= 生徒に診断を促す案内表示)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { MatchResult } from "@/lib/types/matching";

interface MatchingFitCacheResponse {
  results: MatchResult[] | null;
  source: "cache" | "none";
  computedAt?: string;
  preferences?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;

  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 生徒の存在確認 + managedBy スコーピング (matching/route.ts と同じパターン)
  const studentDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!studentDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = studentDoc.data()!;

  if (role !== "superadmin" && userData.managedBy !== callerUid) {
    if (role === "teacher") {
      const { hasActiveSessionAccess } = await import(
        "@/lib/api/session-access"
      );
      const hasAccess = await hasActiveSessionAccess(callerUid, studentId);
      if (!hasAccess) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
  }

  // Firestore キャッシュを読むだけ
  const cacheDoc = await adminDb
    .doc(`users/${studentId}/matchingCache/latest`)
    .get();

  if (!cacheDoc.exists) {
    const response: MatchingFitCacheResponse = {
      results: null,
      source: "none",
    };
    return NextResponse.json(response);
  }

  const data = cacheDoc.data()!;
  const response: MatchingFitCacheResponse = {
    results: Array.isArray(data.results) ? data.results : null,
    source: "cache",
    computedAt: data.computedAt?.toDate?.()?.toISOString() ?? undefined,
    preferences: typeof data.preferences === "string" ? data.preferences : undefined,
  };
  return NextResponse.json(response);
}
