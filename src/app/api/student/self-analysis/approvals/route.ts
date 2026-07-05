/**
 * 生徒が自分の自己分析ステップの承認状況を取得する API。
 * 返却: { steps: { [stepKey]: { approved, by, byName, at } } }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;
  if (!adminDb) return NextResponse.json({ steps: {} });

  const doc = await adminDb.doc(`selfAnalysisApprovals/${uid}`).get();
  return NextResponse.json({ steps: doc.exists ? (doc.data()?.steps ?? {}) : {} });
}
