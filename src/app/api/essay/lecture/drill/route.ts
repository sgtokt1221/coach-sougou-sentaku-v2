import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getLectureById } from "@/data/essay-lectures";
import { gradeDrill, pickDrillItems } from "@/lib/sentence-drill/pick";

/**
 * POST /api/essay/lecture/drill
 *
 * 講義に埋め込んだ文のドリルの結果を保存する。
 * 採点はサーバ側でやり直す（クライアントの正誤をそのまま信じない）。
 * completedAt は Timestamp。他のドリル（logicDrills / summaryDrills）と型を揃える
 * （CLAUDE.md 6.5。混在すると範囲クエリから黙って外れる）。
 */
interface DrillSubmitBody {
  lectureId: string;
  /** 出題順に選んだ選択肢の番号。未回答は -1 */
  selected: number[];
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, [
    "student",
    "admin",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore に接続できません" },
      { status: 500 }
    );
  }

  const body = (await request
    .json()
    .catch(() => null)) as DrillSubmitBody | null;
  if (!body?.lectureId || !Array.isArray(body.selected)) {
    return NextResponse.json(
      { error: "lectureId と selected は必須です" },
      { status: 400 }
    );
  }

  const lecture = getLectureById(body.lectureId);
  if (!lecture?.drill) {
    return NextResponse.json(
      { error: "ドリルが見つかりません" },
      { status: 404 }
    );
  }

  const items = pickDrillItems(
    lecture.drill.kind,
    lecture.id,
    lecture.drill.count ?? 5
  );
  const grade = gradeDrill(items, body.selected);

  await adminDb.collection(`users/${uid}/sentenceDrills`).add({
    userId: uid,
    lectureId: lecture.id,
    kind: lecture.drill.kind,
    correct: grade.correct,
    total: grade.total,
    results: grade.results,
    completedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json(grade);
}
