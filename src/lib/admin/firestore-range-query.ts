import type {
  CollectionReference,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

/**
 * `userId equality + 期間 range + orderBy 範囲フィールド` の典型クエリを実行する。
 *
 * 高速経路: composite index がある場合は Firestore に範囲フィルタとソートを任せる。
 * フォールバック: index 未作成等で失敗したら、equality だけで取得して JS 側で
 * 範囲フィルタ + 降順ソートを行う。
 *
 * 個人スコープのコレクション (1 ユーザーあたり数十〜数百件規模) を前提に設計しているため、
 * 全件取得 + JS フィルタでもパフォーマンス上の問題はない。
 *
 * `.catch(() => ({ docs: [] }))` のような silent fallback と異なり、フォールバック経路自体が
 * 失敗した場合は **例外をそのまま伝搬** させる。呼び出し側が step ラベル付き 500 で
 * ユーザーにエラー詳細を返せるようにするため。
 */
export async function queryWithRangeFilter(
  collection: CollectionReference,
  equalityField: string,
  equalityValue: string,
  rangeField: string,
  start: Date,
  end: Date,
): Promise<{ docs: QueryDocumentSnapshot[] }> {
  try {
    return await collection
      .where(equalityField, "==", equalityValue)
      .where(rangeField, ">=", start)
      .where(rangeField, "<=", end)
      .orderBy(rangeField, "desc")
      .get();
  } catch (indexErr) {
    console.warn(
      `[queryWithRangeFilter] composite index missing on '${collection.id}' (${equalityField} + ${rangeField}), fallback to JS filter:`,
      indexErr,
    );
    const snap = await collection.where(equalityField, "==", equalityValue).get();
    const filtered = snap.docs.filter((d) => {
      const t = (d.data() as Record<string, unknown>)[rangeField];
      const date = (t as { toDate?: () => Date } | undefined)?.toDate?.();
      return date && date >= start && date <= end;
    });
    filtered.sort((a, b) => {
      const ta =
        ((a.data() as Record<string, unknown>)[rangeField] as
          | { toDate?: () => Date }
          | undefined)?.toDate?.()?.getTime() ?? 0;
      const tb =
        ((b.data() as Record<string, unknown>)[rangeField] as
          | { toDate?: () => Date }
          | undefined)?.toDate?.()?.getTime() ?? 0;
      return tb - ta;
    });
    return { docs: filtered };
  }
}
