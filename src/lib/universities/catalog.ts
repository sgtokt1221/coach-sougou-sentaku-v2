import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";
import type { EnglishCert } from "@/lib/types/user";

/**
 * 志望校探索 (AI対話) 用の大学カタログ生成と要件適合判定。
 * 推薦対象は「総合型選抜 / 学校推薦型選抜」の学部に限定する。
 */

const EXPLORABLE_TYPES = new Set(["comprehensive", "school_recommendation"]);

export interface CatalogEntry {
  /** "universityId:facultyId" 複合キー (= targetUniversities の要素形式) */
  key: string;
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  group: string;
  selectionType: "comprehensive" | "school_recommendation";
  gpaRequirement: number | null;
  englishRequirement: string | null;
  academicField?: string;
}

/** 大学データ取得 (Firestore → mock フォールバック)。サーバー専用。 */
async function getUniversities(): Promise<University[]> {
  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const snap = await adminDb.collection("universities").get();
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
      }
    }
  } catch {
    // fall through to mock
  }
  return MOCK_UNIVERSITIES;
}

/**
 * 志望校（"uniId:facId" 複合キー）から、各学部のアドミッションポリシー(AP)本文を整形して返す。
 * 自己分析 Step 7「統合・言語化」で実APをプロンプトに注入するために使う。
 */
export async function getAdmissionPolicies(compoundKeys: string[]): Promise<string> {
  if (!compoundKeys || compoundKeys.length === 0) return "";
  const universities = await getUniversities();
  const byId = new Map(universities.map((u) => [u.id, u]));
  const blocks: string[] = [];
  for (const key of compoundKeys) {
    const [universityId, facultyId] = key.split(":");
    const u = byId.get(universityId);
    if (!u) continue;
    const f = u.faculties?.find((x) => x.id === facultyId);
    if (!f) continue;
    const ap = (f.admissionPolicy ?? "").trim();
    blocks.push(`■ ${u.name} ${f.name}\n${ap || "（APテキスト未登録）"}`);
  }
  return blocks.join("\n\n");
}

/** 総合型/学校推薦型の学部のみを CatalogEntry[] に展開 */
export async function getExplorerCatalog(): Promise<CatalogEntry[]> {
  const universities = await getUniversities();
  const entries: CatalogEntry[] = [];
  for (const u of universities) {
    for (const f of u.faculties ?? []) {
      const st = f.selectionType;
      if (!st || !EXPLORABLE_TYPES.has(st)) continue;
      entries.push({
        key: `${u.id}:${f.id}`,
        universityId: u.id,
        facultyId: f.id,
        universityName: u.name,
        facultyName: f.name,
        group: u.group,
        selectionType: st,
        gpaRequirement: f.requirements?.gpa ?? null,
        englishRequirement: f.requirements?.englishCert ?? null,
        academicField: f.academicField,
      });
    }
  }
  return entries;
}

/** AI に渡すコンパクトなカタログ文字列 (AP本文は含めずトークン節約) */
export function formatCatalogForPrompt(entries: CatalogEntry[]): string {
  return entries
    .map((e) => {
      const sel = e.selectionType === "comprehensive" ? "総合型" : "学校推薦型";
      return `${e.key} | ${e.universityName} ${e.facultyName} | ${e.group} | ${sel} | GPA:${e.gpaRequirement ?? "—"} | 英語:${e.englishRequirement ?? "—"}${e.academicField ? ` | ${e.academicField}` : ""}`;
    })
    .join("\n");
}

export type EligibilityState = "ok" | "ng" | "unknown";

export interface EligibilityResult {
  gpa: EligibilityState;
  english: EligibilityState;
}

/**
 * GPA・英語資格が出願要件を満たすかの簡易判定。
 * 英語はスコア体系が多様で厳密比較が難しいため「要件有り×資格保有有無」で判定する。
 */
export function checkEligibility(
  req: { gpa: number | null; englishCert: string | null },
  profile: { gpa?: number | null; englishCerts?: Pick<EnglishCert, "type">[] }
): EligibilityResult {
  let gpa: EligibilityState = "unknown";
  if (req.gpa == null) {
    gpa = "ok"; // 要件なし
  } else if (profile.gpa != null) {
    gpa = profile.gpa >= req.gpa ? "ok" : "ng";
  }

  let english: EligibilityState = "unknown";
  if (!req.englishCert) {
    english = "ok"; // 要件なし
  } else {
    english = (profile.englishCerts?.length ?? 0) > 0 ? "ok" : "ng";
  }

  return { gpa, english };
}
