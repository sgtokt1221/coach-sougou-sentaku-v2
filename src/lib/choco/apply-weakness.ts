import type { WeaknessRecord } from "@/lib/types/growth";
import { updateWeaknessRecords } from "@/lib/growth/analyze";

/**
 * ちょこ添削の弱点タグを users/{uid}/weaknesses に等倍反映する。
 *
 * essay review route (src/app/api/essay/review/route.ts) と同一経路:
 * 既存レコードを resolved=false かつ未 archive で取得 → Timestamp を Date へ
 * 変換 → updateWeaknessRecords で更新 → 同じ書き込み形状でバッチ保存する。
 *
 * @param uid 対象ユーザー ID
 * @param weaknessTags ちょこ添削が抽出した弱点タグ
 */
export async function applyChocoWeaknesses(
  uid: string,
  weaknessTags: string[],
): Promise<void> {
  if (weaknessTags.length === 0) return;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;

  const col = adminDb.collection(`users/${uid}/weaknesses`);

  // essay review route と同じ取得・マッピング (resolved=false + 未 archive)
  const weaknessDocs = await col.where("resolved", "==", false).get();
  const existing: WeaknessRecord[] = weaknessDocs.docs
    .filter((d) => !d.data().archivedAt) // Phase 4: archive 済みは集計から除外
    .map((d) => {
      const w = d.data();
      return {
        area: w.area,
        count: w.count,
        firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
        lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
        improving: w.improving ?? false,
        resolved: w.resolved ?? false,
        source: w.source ?? "essay",
        reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
        categoryId: w.categoryId,
        archivedAt: w.archivedAt?.toDate?.() ?? w.archivedAt ?? null,
      } satisfies WeaknessRecord;
    });

  const updated = updateWeaknessRecords(existing, weaknessTags, "essay");

  // essay review route と同じ書き込み形状でバッチ保存
  const batch = adminDb.batch();
  for (const w of updated) {
    batch.set(
      col.doc(w.area),
      {
        area: w.area,
        count: w.count,
        firstOccurred: w.firstOccurred,
        lastOccurred: w.lastOccurred,
        improving: w.improving,
        resolved: w.resolved,
        source: w.source,
        reminderDismissedAt: w.reminderDismissedAt,
        ...(w.categoryId ? { categoryId: w.categoryId } : {}),
      },
      { merge: true },
    );
  }
  await batch.commit();
}
