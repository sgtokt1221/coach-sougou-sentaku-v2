/**
 * 管理者が個別生徒の志望校マッチング (Discover) を閲覧するための API。
 * 生徒のプロフィール (GPA / 英語資格 / 志望校) を基にマッチングエンジンを走らせて
 * 結果を返す。マッチング結果自体は永続化していないので都度計算。
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { matchUniversities } from "@/lib/matching/engine";
import type { MatchingRequest, MatchingResponse } from "@/lib/types/matching";
import type { University } from "@/lib/types/university";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;

  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 生徒の存在確認 + managedBy スコーピング
  const studentDoc = await adminDb.doc(`users/${studentId}`).get();
  if (!studentDoc.exists) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }
  const userData = studentDoc.data()!;

  if (role !== "superadmin" && userData.managedBy !== callerUid) {
    if (role === "teacher") {
      const { hasActiveSessionAccess } = await import("@/lib/api/session-access");
      const hasAccess = await hasActiveSessionAccess(callerUid, studentId);
      if (!hasAccess) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
  }

  // 生徒のプロフィールから MatchingRequest を組み立て
  const profile: MatchingRequest = {};
  if (typeof userData.gpa === "number") profile.gpa = userData.gpa;
  if (Array.isArray(userData.englishCerts) && userData.englishCerts.length > 0) {
    profile.englishCerts = userData.englishCerts;
  }

  // 大学データを admin-sdk 経由で取得
  let universities: University[] = [];
  try {
    const snap = await adminDb.collection("universities").get();
    universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
  } catch (err) {
    console.warn("[admin/matching] failed to load universities", err);
  }

  if (universities.length === 0) {
    // fallback: モックでも結果を返せるようにしておく
    const { MOCK_UNIVERSITIES } = await import("@/lib/matching/mockData");
    universities = MOCK_UNIVERSITIES;
  }

  const results = await matchUniversities(profile, universities);
  const response: MatchingResponse & { targetUniversities: string[] } = {
    results,
    totalUniversities: universities.length,
    matchedCount: results.filter((r) => r.matchScore >= 60).length,
    targetUniversities: Array.isArray(userData.targetUniversities)
      ? userData.targetUniversities
      : [],
  };

  return NextResponse.json(response);
}
