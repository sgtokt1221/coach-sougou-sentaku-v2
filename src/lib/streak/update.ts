import { WritingStreak } from '@/lib/types/writing-streak';
import { STREAK_BADGES } from './badges';
import { toJstDateString, daysBetween } from './datetime';

/**
 * 小論文レビュー時にストリークデータを更新
 */
export async function updateStreakOnEssayReview(
  uid: string,
  db: FirebaseFirestore.Firestore
): Promise<WritingStreak> {
  try {
    const { FieldValue } = await import('firebase-admin/firestore');
    const streakRef = db.doc(`users/${uid}/writingStreak/main`);

    // 既存データを取得（無ければ初期化）
    const snapshot = await streakRef.get();
    const existing: WritingStreak = snapshot.exists
      ? {
          current: snapshot.data()?.current ?? 0,
          longest: snapshot.data()?.longest ?? 0,
          lastWriteDate: snapshot.data()?.lastWriteDate ?? "",
          badges: snapshot.data()?.badges ?? [],
          updatedAt: snapshot.data()?.updatedAt ?? "",
        }
      : {
          current: 0,
          longest: 0,
          lastWriteDate: "",
          badges: [],
          updatedAt: "",
        };

    const today = toJstDateString(new Date());

    // 既に今日提出済みの場合は変更なし
    if (existing.lastWriteDate === today) {
      return existing;
    }

    // ストリーク計算
    let newCurrent: number;
    if (existing.lastWriteDate === "" || daysBetween(existing.lastWriteDate, today) === 1) {
      // 初回 or 昨日から連続
      newCurrent = existing.current + 1;
    } else {
      // リセット
      newCurrent = 1;
    }

    const newLongest = Math.max(existing.longest, newCurrent);

    // 新規バッジチェック
    const newBadges = [...existing.badges];
    for (const badge of STREAK_BADGES) {
      if (newCurrent >= badge.days && !existing.badges.includes(badge.id)) {
        newBadges.push(badge.id);
      }
    }

    const updatedStreak: WritingStreak = {
      current: newCurrent,
      longest: newLongest,
      lastWriteDate: today,
      badges: newBadges,
      updatedAt: new Date().toISOString(), // クライアントでは実際にServerTimestampを文字列化
    };

    // Firestore保存（実際にはServerTimestamp使用）
    await streakRef.set({
      ...updatedStreak,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return updatedStreak;
  } catch (error) {
    console.error('Failed to update writing streak:', error);
    // 失敗時は既存値返却（添削処理を阻害しない）
    const snapshot = await db.doc(`users/${uid}/writingStreak/main`).get().catch(() => null);
    if (snapshot?.exists) {
      const data = snapshot.data();
      return {
        current: data?.current ?? 0,
        longest: data?.longest ?? 0,
        lastWriteDate: data?.lastWriteDate ?? "",
        badges: data?.badges ?? [],
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() ?? "",
      };
    }

    // 完全失敗時は初期値
    return {
      current: 0,
      longest: 0,
      lastWriteDate: "",
      badges: [],
      updatedAt: "",
    };
  }
}
