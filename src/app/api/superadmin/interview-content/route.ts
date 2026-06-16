import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type {
  ContentMode,
  InterviewContentItem,
} from "@/lib/types/interview-content";
import { INTERVIEW_CONTENT_SEED } from "@/data/interview-content";

const COLLECTION = "interviewContent";
const VALID_MODES: ContentMode[] = [
  "group_discussion",
  "individual",
  "oral_exam",
  "presentation",
  "skill_check",
];

/**
 * GET: 面接コンテンツ・バンク一覧 (superadmin 限定)。`?mode=` で絞り込み。
 * Firestore に該当モードの項目があればそれを、無ければ静的 seed を返す
 * (universities と同じフォールバック戦略)。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;

  const modeParam = request.nextUrl.searchParams.get("mode") as ContentMode | null;
  const modeFilter = modeParam && VALID_MODES.includes(modeParam) ? modeParam : null;

  // Firestore 未設定時は seed をそのまま返す
  if (!adminDb) {
    const items = modeFilter
      ? INTERVIEW_CONTENT_SEED.filter((i) => i.mode === modeFilter)
      : INTERVIEW_CONTENT_SEED;
    return NextResponse.json({ items, source: "seed" });
  }

  try {
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);
    if (modeFilter) query = query.where("mode", "==", modeFilter);
    const snap = await query.get();
    const fromDb = snap.docs
      .map((d) => ({ ...(d.data() as InterviewContentItem), id: d.id }))
      .filter((i) => i.active !== false);

    // Firestore が空(未シード)なら seed を表示用に返す
    if (fromDb.length === 0) {
      const items = modeFilter
        ? INTERVIEW_CONTENT_SEED.filter((i) => i.mode === modeFilter)
        : INTERVIEW_CONTENT_SEED;
      return NextResponse.json({ items, source: "seed" });
    }
    return NextResponse.json({ items: fromDb, source: "firestore" });
  } catch (err) {
    console.error("[interview-content] GET failed:", err);
    const items = modeFilter
      ? INTERVIEW_CONTENT_SEED.filter((i) => i.mode === modeFilter)
      : INTERVIEW_CONTENT_SEED;
    return NextResponse.json({ items, source: "seed" });
  }
}

/**
 * POST: 新規バンク項目の作成 (superadmin 限定)。
 * body: { mode, title, category?, description?, facultyId? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) return NextResponse.json({ error: "DB 未初期化" }, { status: 500 });

  let body: Partial<InterviewContentItem>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  const mode = body.mode;
  const title = body.title?.trim();
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "mode が不正です" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title は必須です" }, { status: 400 });
  }

  const ref = adminDb.collection(COLLECTION).doc();
  const newItem: InterviewContentItem = {
    id: ref.id,
    mode,
    title,
    ...(body.category?.trim() ? { category: body.category.trim() } : {}),
    ...(body.description?.trim() ? { description: body.description.trim() } : {}),
    ...(body.facultyId ? { facultyId: body.facultyId } : {}),
    active: true,
    createdAt: new Date().toISOString(),
  };
  await ref.set(newItem);
  return NextResponse.json({ item: newItem }, { status: 201 });
}
