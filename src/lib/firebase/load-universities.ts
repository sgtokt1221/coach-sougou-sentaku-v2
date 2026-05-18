import type { University } from "@/lib/types/university";
import { UniversityListSchema, UniversitySchema } from "@/lib/types/university-schema";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";

/**
 * Firestore から大学一覧を取得し zod でスキーマ検証する共通ローダ。
 * Firestore に接続できない / 取得失敗 / スキーマ違反のいずれでも
 * MOCK_UNIVERSITIES へフォールバックして 200 応答を維持する。
 */
export async function loadAllUniversities(group?: string | null): Promise<University[]> {
  const fallback = () =>
    group ? MOCK_UNIVERSITIES.filter((u) => u.group === group) : MOCK_UNIVERSITIES;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return fallback();

  try {
    const ref = adminDb.collection("universities");
    const q = group ? ref.where("group", "==", group) : ref;
    const snap = await q.get();
    if (snap.empty) return fallback();

    const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const result = UniversityListSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        "[loadAllUniversities] Firestore data failed schema validation; falling back to mock.",
        result.error.issues.slice(0, 5),
      );
      return fallback();
    }
    return result.data;
  } catch (e) {
    console.warn("[loadAllUniversities] Firestore fetch error; falling back to mock.", e);
    return fallback();
  }
}

/**
 * Firestore から大学単体を取得し zod でスキーマ検証する共通ローダ。
 * 取得失敗・存在しない・スキーマ違反いずれも MOCK_UNIVERSITIES からの解決を試みる。
 */
export async function loadUniversityById(id: string): Promise<University | null> {
  const mockHit = () => MOCK_UNIVERSITIES.find((u) => u.id === id) ?? null;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return mockHit();

  try {
    const doc = await adminDb.doc(`universities/${id}`).get();
    if (!doc.exists) return mockHit();

    const raw = { id: doc.id, ...doc.data() };
    const result = UniversitySchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        `[loadUniversityById:${id}] schema validation failed; falling back to mock.`,
        result.error.issues.slice(0, 5),
      );
      return mockHit();
    }
    return result.data;
  } catch (e) {
    console.warn(`[loadUniversityById:${id}] fetch error; falling back to mock.`, e);
    return mockHit();
  }
}
