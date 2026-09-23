import type { Firestore } from "firebase-admin/firestore";
import type { WeaknessRecord } from "@/lib/types/growth";
import { weaknessDocId } from "@/lib/growth/weakness-id";

/**
 * 弱点レコード（users/{uid}/weaknesses）の読み書きの正本。
 *
 * 以前は小論文・面接・スキルチェック・宿題・講座・ちょこ添削の8か所が、
 * それぞれ手で読み書きしていた。そのせいで次の沈黙失敗があった（2026-09-23 点検）:
 *   - 統合で吸収した元の文書を消さず、提出のたびに回数が合算され直した
 *     （本番で実際の11回が33回に。全体で1.29倍）
 *   - archivedAt / canonicalId を書いておらず、アーカイブが一度も保存されなかった
 *   - 解決済みの弱点を読まずに、同じ文書を回数1で上書きし得た
 *   - 文書 ID に弱点名をそのまま使う経路があった（"/" を含むと書き込みが落ちる）
 */

type DocData = Record<string, unknown>;

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fromDoc(w: DocData): WeaknessRecord {
  return {
    area: String(w.area ?? ""),
    count: typeof w.count === "number" ? w.count : 1,
    firstOccurred: toDate(w.firstOccurred) ?? new Date(),
    lastOccurred: toDate(w.lastOccurred) ?? new Date(),
    improving: w.improving === true,
    resolved: w.resolved === true,
    source: (w.source as WeaknessRecord["source"]) ?? "essay",
    reminderDismissedAt: toDate(w.reminderDismissedAt),
    ...(w.categoryId
      ? { categoryId: w.categoryId as WeaknessRecord["categoryId"] }
      : {}),
    ...(typeof w.canonicalId === "string"
      ? { canonicalId: w.canonicalId }
      : {}),
    archivedAt: toDate(w.archivedAt),
    ...(typeof w.lastExample === "string"
      ? { lastExample: w.lastExample }
      : {}),
    ...(Array.isArray(w.recentHits)
      ? { recentHits: (w.recentHits as unknown[]).map((x) => (x ? 1 : 0)) }
      : {}),
    ...(typeof w.missStreak === "number" ? { missStreak: w.missStreak } : {}),
  };
}

/**
 * 1人分の弱点を**すべて**読む（解決済み・アーカイブ済みも含む）。
 *
 * 更新（updateWeaknessRecords）には全件を渡す。解決済みを除いて渡すと、
 * 再び指摘されたときに新規として作り、同じ文書を回数1で上書きしてしまう。
 * AI に渡す一覧は activeWeaknesses() で絞る。
 */
export interface LoadedWeaknesses {
  records: WeaknessRecord[];
  /**
   * 読んだ文書の ID。保存時に「今回の結果に無いもの」を消すのに使う。
   * 古い経路で作られた文書は ID と area がずれていることがあるので、
   * area から ID を作り直さず、実際の ID を持ち回る。
   */
  docIds: string[];
}

export async function loadWeaknessRecords(
  db: Firestore,
  uid: string
): Promise<LoadedWeaknesses> {
  const snap = await db.collection(`users/${uid}/weaknesses`).get();
  return {
    records: snap.docs.map((d) => fromDoc(d.data())),
    docIds: snap.docs.map((d) => d.id),
  };
}

/** AI への文脈・成長イベントに使う弱点（解決済み・アーカイブ済みを除く） */
export function activeWeaknesses(records: WeaknessRecord[]): WeaknessRecord[] {
  return records.filter((w) => !w.resolved && !w.archivedAt);
}

function toDoc(w: WeaknessRecord): DocData {
  // Firestore は undefined を含むと書き込み全体を拒否するので、値のあるものだけ載せる
  return {
    area: w.area,
    count: w.count,
    firstOccurred: w.firstOccurred,
    lastOccurred: w.lastOccurred,
    improving: w.improving,
    resolved: w.resolved,
    source: w.source,
    reminderDismissedAt: w.reminderDismissedAt ?? null,
    // null を明示して書く。書かないと merge で古いアーカイブが残る／新しいものが保存されない
    archivedAt: w.archivedAt ?? null,
    recentHits: w.recentHits ?? [],
    missStreak: w.missStreak ?? 0,
    ...(w.categoryId ? { categoryId: w.categoryId } : {}),
    ...(w.canonicalId ? { canonicalId: w.canonicalId } : {}),
    ...(w.lastExample ? { lastExample: w.lastExample } : {}),
  };
}

/**
 * 更新後の弱点を保存する。
 *
 * before（読んだときの文書）にあって after に無い文書は消す。統合で吸収された
 * 元の文書を残すと、次の提出でまた吸収され、そのたびに回数が足される。
 * 講師が面談で入れた弱点（source="lesson"）も同じ。吸収されたときは回数が
 * 統合先に入っているので消してよい。吸収されなければ after に残るので消えない。
 */
export async function saveWeaknessRecords(
  db: Firestore,
  uid: string,
  before: LoadedWeaknesses,
  after: WeaknessRecord[]
): Promise<void> {
  const col = db.collection(`users/${uid}/weaknesses`);
  const batch = db.batch();
  const keep = new Set<string>();
  for (const w of after) {
    const id = weaknessDocId(w.area);
    keep.add(id);
    batch.set(col.doc(id), toDoc(w), { merge: true });
  }
  for (const id of before.docIds) {
    if (keep.has(id)) continue;
    batch.delete(col.doc(id));
  }
  await batch.commit();
}
