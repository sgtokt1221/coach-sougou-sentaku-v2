import { updateWeaknessRecords } from "@/lib/growth/analyze";
import {
  loadWeaknessRecords,
  saveWeaknessRecords,
} from "@/lib/growth/weakness-store";

/**
 * ちょこ添削の弱点タグを users/{uid}/weaknesses に等倍反映する。
 *
 * 読み書きは他の提出と同じ weakness-store を通す。
 *
 * @param uid 対象ユーザー ID
 * @param weaknessTags ちょこ添削が抽出した弱点タグ
 */
export async function applyChocoWeaknesses(
  uid: string,
  weaknessTags: string[]
): Promise<void> {
  if (weaknessTags.length === 0) return;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return;

  const loaded = await loadWeaknessRecords(adminDb, uid);
  const updated = updateWeaknessRecords(loaded.records, weaknessTags, {
    source: "essay",
    // 段落の穴埋め練習なので、挙がらなかった弱点を「指摘されなかった」と数えない
    countMisses: false,
  });
  // 文書 ID は weaknessDocId を通す（以前は area をそのまま使っており "/" で落ちた）
  await saveWeaknessRecords(adminDb, uid, loaded, updated);
}
