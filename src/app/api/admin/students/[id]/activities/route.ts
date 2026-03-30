import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { ActivityCategory } from "@/lib/types/activity";

interface ActivityListItem {
  id: string;
  title: string;
  category: ActivityCategory;
  period: { start: string; end: string };
  description: string;
  isStructured: boolean;
  updatedAt: string;
}

const MOCK_ACTIVITIES: ActivityListItem[] = [
  {
    id: "act_001",
    title: "生徒会長として学校改革",
    category: "leadership",
    period: { start: "2025-04-01", end: "2026-03-31" },
    description: "生徒会長として校則改正プロジェクトを主導。全校生徒アンケートを実施し、合理的な校則改正案を策定。",
    isStructured: true,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_002",
    title: "地域清掃ボランティア",
    category: "volunteer",
    period: { start: "2025-06-01", end: "2025-12-31" },
    description: "月2回の地域清掃活動に参加。参加者募集や活動報告の作成を担当。",
    isStructured: true,
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_003",
    title: "数学オリンピック出場",
    category: "competition",
    period: { start: "2025-07-01", end: "2025-08-15" },
    description: "日本数学オリンピック予選に出場。",
    isStructured: false,
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act_004",
    title: "プログラミング部での研究活動",
    category: "research",
    period: { start: "2025-04-01", end: "2026-03-31" },
    description: "機械学習を用いた植物の成長予測モデルの研究。",
    isStructured: false,
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId } = await params;

  if (!adminDb) {
    return NextResponse.json(MOCK_ACTIVITIES);
  }

  try {
    if (role !== "superadmin") {
      const studentDoc = await adminDb.doc(`users/${studentId}`).get();
      if (!studentDoc.exists || studentDoc.data()?.managedBy !== callerUid) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
    }

    const snapshot = await adminDb
      .collection(`users/${studentId}/activities`)
      .orderBy("updatedAt", "desc")
      .get();

    const activities: ActivityListItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title ?? "",
        category: data.category ?? "other",
        period: data.period ?? { start: "", end: "" },
        description: data.description ?? "",
        isStructured: !!data.structuredData,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Admin student activities error:", error);
    return NextResponse.json(MOCK_ACTIVITIES);
  }
}
