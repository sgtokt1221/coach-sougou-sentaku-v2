/**
 * 学部ごとの「公式サイトで確かめた特色」（2026-11-27）。
 *
 * 学部ごとに1回だけ公式サイトを調べ、コース・学びの特色・独自プログラムを、出典URLと
 * ページの原文の引用つきで保存する（facultyInfo/{universityId}__{facultyId}）。
 * 下書き・別の案・添削はそれを読むだけで、Web検索はしない。全塾で共有し、生徒の情報は入れない。
 * このファイルは読むだけと、照合の部品。AI を呼ぶ処理は faculty-info-research.ts。
 */

/** 集め方の規則を変えたら上げる */
export const FACULTY_INFO_VERSION = "faculty-info-v1";
export const FACULTY_INFO_COLLECTION = "facultyInfo";

export type FacultyInfoCategory = "course" | "feature" | "program";

export const FACULTY_INFO_CATEGORY_LABELS: Record<FacultyInfoCategory, string> = {
  course: "コース・専攻",
  feature: "学びの特色",
  program: "独自プログラム",
};

export interface FacultyInfoItem {
  /** sha256(sourceUrl + quote) の先頭12字。取り直しても同じ項目は同じ ID */
  id: string;
  category: FacultyInfoCategory;
  title: string;
  summary: string;
  /** 出典ページの原文そのまま */
  quote: string;
  sourceUrl: string;
  origin: "ai" | "manual";
  /** 先生が外したら true（消さずに残す） */
  hidden: boolean;
}

export type FacultyInfoStatus = "ready" | "empty" | "failed" | "running";

export function facultyInfoDocId(universityId: string, facultyId: string): string {
  return `${universityId}__${facultyId}`;
}

/**
 * URL の登録ドメイン。調べてよい範囲（公式サイト）に使う。
 * 関西大学は入試が www.nyusi.kansai-u.ac.jp、本体が www.kansai-u.ac.jp なので、
 * ホスト名でなく kansai-u.ac.jp で許可する。.ac.jp / .go.jp などは末尾3ラベル、それ以外は末尾2ラベル。
 */
export function registrableDomain(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const secondLevel = ["ac", "co", "go", "or", "ne", "ed", "lg"];
  const take =
    labels.length >= 3 &&
    labels[labels.length - 1] === "jp" &&
    secondLevel.includes(labels[labels.length - 2])
      ? 3
      : 2;
  return labels.slice(-take).join(".");
}

/** URL が許可した登録ドメインの中か（サブドメインも含む） */
export function inAllowedDomains(url: string, domains: string[]): boolean {
  const d = registrableDomain(url);
  return d !== null && domains.includes(d);
}

/** 照合用に、空白・句読点・括弧・記号を落とす */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\s　、，,。．.・「」『』（）()【】［］\[\]〈〉《》“”"'’‘：:；;！!？?…―ー\-~〜/／|｜]/g, "");
}

/** 引用がページ本文に本当にあるか（20字以上のときだけ） */
export function quoteInPage(quote: string, pageText: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length >= 20 && normalizeForMatch(pageText).includes(q);
}

/** 文中の数字（全角も半角に寄せる） */
export function numbersIn(text: string): string[] {
  return text.normalize("NFKC").match(/\d+(?:\.\d+)?/g) ?? [];
}

/** 教員・研究室の名前を含みそうな項目（集めない） */
export const PERSON_LIKE = /教授|准教授|講師|助教|先生|研究室|ゼミナール[^\s]{0,2}名|氏$/;

/**
 * 下書き・添削に渡す、使ってよい項目。
 * 取得済み（ready）で、先生が外していないものだけ。無ければ空配列。
 */
export async function loadFacultyInfo(
  universityId: string | undefined,
  facultyId: string | undefined
): Promise<FacultyInfoItem[]> {
  if (!universityId || !facultyId) return [];
  if (process.env.FACULTY_INFO_CACHE === "memory") return [];
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .doc(`${FACULTY_INFO_COLLECTION}/${facultyInfoDocId(universityId, facultyId)}`)
      .get();
    const data = snap.data();
    if (!data || data.status !== "ready" || !Array.isArray(data.items)) return [];
    return (data.items as FacultyInfoItem[]).filter((i) => !i.hidden);
  } catch (e) {
    console.warn("[faculty-info] 読み込みに失敗", e);
    return [];
  }
}
