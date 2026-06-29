import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

/**
 * 志望校の compound ID（"universityId:facultyId"）一覧を解決し、ダッシュボードの
 * 志望校カード表示に必要な情報（大学名・学部名・AP・入試日程）を返す。
 *
 * データ源は /api/universities/[id] と同じく「MOCK フォールバック + Firestore 上書き」。
 * 同一 universityId は1回だけ取得してまとめる。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const compoundIds = idsParam.split(",").filter(Boolean);

  if (compoundIds.length === 0) {
    return NextResponse.json({ resolved: [] });
  }

  const { adminDb } = await import("@/lib/firebase/admin");

  // 同一 universityId をまとめて1回だけ取得するキャッシュ
  const uniCache = new Map<string, University | null>();
  async function getUniversity(universityId: string): Promise<University | null> {
    if (uniCache.has(universityId)) return uniCache.get(universityId)!;
    let uni: University | null =
      MOCK_UNIVERSITIES.find((u) => u.id === universityId) ?? null;
    if (adminDb) {
      try {
        const snap = await adminDb.doc(`universities/${universityId}`).get();
        if (snap.exists) {
          uni = { id: snap.id, ...snap.data()! } as University;
        }
      } catch {
        // Firestore 失敗時は MOCK にフォールバック
      }
    }
    uniCache.set(universityId, uni);
    return uni;
  }

  const resolved: {
    universityId: string;
    facultyId: string;
    universityName: string;
    facultyName: string;
    admissionPolicy?: string;
    schedule?: University["faculties"][number]["schedule"];
    scheduleLastYear?: University["faculties"][number]["scheduleLastYear"];
  }[] = [];

  for (const compoundId of compoundIds) {
    const [universityId, facultyId] = compoundId.split(":");
    const uni = await getUniversity(universityId);
    if (!uni) continue;
    const faculty = uni.faculties?.find((f) => f.id === facultyId);
    resolved.push({
      universityId,
      facultyId: facultyId ?? "",
      universityName: uni.name,
      facultyName: faculty?.name ?? "全学部",
      admissionPolicy: faculty?.admissionPolicy,
      schedule: faculty?.schedule,
      scheduleLastYear: faculty?.scheduleLastYear,
    });
  }

  return NextResponse.json({ resolved });
}
