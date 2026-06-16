/**
 * 面接コンテンツ・バンクのサーバー読み取り（server 専用）。
 *
 * Firestore `interviewContent` から該当モードの active な項目を取得し、
 * 未設定/空/失敗時は静的 seed (`INTERVIEW_CONTENT_SEED`) にフォールバックする
 * （universities の GET と同じ戦略）。トークンAPI/開始APIから利用する。
 */

import { adminDb } from "@/lib/firebase/admin";
import type { InterviewContentItem, ContentMode } from "@/lib/types/interview-content";
import { seedForMode } from "@/data/interview-content";

const COLLECTION = "interviewContent";

/** 学部名キーワード → 口頭試問 category 寄せ（gd-themes と同方針）。 */
const FACULTY_CATEGORY_HINTS: { keywords: string[]; category: string }[] = [
  { keywords: ["医", "生命", "看護", "薬", "健康"], category: "医療・生命" },
  { keywords: ["国際", "グローバル", "外国語", "言語"], category: "国際" },
  { keywords: ["教育"], category: "教育" },
  { keywords: ["理工", "工", "情報", "理", "数理", "システム"], category: "理工" },
  { keywords: ["社会", "政策", "法", "経済", "商", "経営"], category: "社会" },
  { keywords: ["文", "文化", "心理", "神", "人文", "芸術"], category: "人文" },
];

function categoryForFaculty(facultyName?: string): string | null {
  if (!facultyName) return null;
  for (const hint of FACULTY_CATEGORY_HINTS) {
    if (hint.keywords.some((k) => facultyName.includes(k))) return hint.category;
  }
  return null;
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * 指定モードの active なバンク項目を取得。Firestore優先・空/失敗時は静的seed。
 */
export async function getInterviewContent(
  mode: ContentMode,
  opts?: { facultyName?: string },
): Promise<InterviewContentItem[]> {
  let items: InterviewContentItem[] = seedForMode(mode);

  if (adminDb) {
    try {
      const snap = await adminDb
        .collection(COLLECTION)
        .where("mode", "==", mode)
        .get();
      if (!snap.empty) {
        const fromDb = snap.docs
          .map((d) => ({ ...(d.data() as InterviewContentItem), id: d.id }))
          .filter((i) => i.active !== false);
        if (fromDb.length > 0) items = fromDb;
      }
    } catch {
      /* fall through to seed */
    }
  }

  // 口頭試問は学部系統に寄せる（該当が無ければ全体）。
  if (mode === "oral_exam") {
    const cat = categoryForFaculty(opts?.facultyName);
    if (cat) {
      const matched = items.filter((i) => i.category === cat);
      if (matched.length > 0) return matched;
    }
  }
  return items;
}

/**
 * 1件だけ選ぶ（GD/スキルチェック用）。seed 指定で決定的、無指定でランダム。
 * 候補が無ければ null。
 */
export async function pickOneInterviewContent(
  mode: ContentMode,
  opts?: { facultyName?: string; seed?: string },
): Promise<InterviewContentItem | null> {
  const items = await getInterviewContent(mode, opts);
  if (items.length === 0) return null;
  const idx =
    opts?.seed != null
      ? hashSeed(opts.seed) % items.length
      : Math.floor(Math.random() * items.length);
  return items[idx];
}
