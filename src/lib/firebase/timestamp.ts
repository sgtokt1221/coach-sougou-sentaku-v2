/**
 * Firestore Timestamp 関連の正規化ヘルパー。
 *
 * Firestore のドキュメントに保存される日時フィールドは、保存経路によって複数の
 * 形式で混在しうる:
 * - **Firestore Admin Timestamp** (`{ toDate(), _seconds, _nanoseconds }`)
 * - **JavaScript `Date` インスタンス** (`new Date()` を直接 set した場合、
 *   Firestore は内部で Timestamp に変換するが、過渡期の merge 等で残ることがある)
 * - **ISO 文字列** (古い実装で `string` のまま set した場合)
 * - **JSON serialized Timestamp** (`{ _seconds, _nanoseconds }` だけの plain object、
 *   サーバー間で JSON 化されたデータ等)
 *
 * これらを `.toDate()` で直接呼ぶと、 Date / string / plain object のケースで
 * `TypeError: toDate is not a function` になる。
 * 共通ヘルパー経由で正規化することで全形式に対応する。
 */

/**
 * 任意の値を `Date` に正規化する。対応外なら `null`。
 */
export function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object") {
    const obj = v as {
      toDate?: () => Date;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof obj.toDate === "function") {
      try {
        const d = obj.toDate();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
      } catch {
        // fall through to seconds path
      }
    }
    const sec = obj._seconds ?? obj.seconds;
    if (typeof sec === "number") {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/**
 * 任意の値を ISO 文字列に正規化する。対応外なら `undefined`。
 */
export function toIsoString(v: unknown): string | undefined {
  const d = toDateSafe(v);
  return d ? d.toISOString() : undefined;
}
