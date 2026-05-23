import type { Firestore } from "firebase-admin/firestore";
import type { Faculty, University } from "@/lib/types/university";

/**
 * 類題生成プロンプトに渡す「生徒の個別文脈」。
 *
 * 何も設定していない生徒（オンボーディング途中など）も呼び出せるよう、
 * 各フィールドは独立に optional / 空配列で耐える。
 */
export interface StudentContext {
  /** 直近のメイン志望校 (最大3校、targetUniversities 配列の先頭から) */
  primaryTargets: Array<{
    universityName: string;
    facultyName: string;
    /** 1校だけの AP 原文。プロンプトに直接埋め込む */
    admissionPolicy: string;
  }>;
  /** 自己分析の主要要素。未完了生徒は null */
  selfAnalysis: {
    coreValues: string[];
    uniqueCombo: string;
    interests: string[];
    shortTermGoal: string;
    /** AP との接続を生徒自身が言語化したもの。最も重要 */
    apConnection: string;
  } | null;
  /** "ENFP" 等の 4 文字 MBTI。未測定なら null */
  mbtiType: string | null;
  /** 直近 3 件 (createdAt 降順)。空ならスキップ */
  recentActivities: Array<{
    title: string;
    category: string;
    /** description を 200 字に切り詰めたもの */
    summary: string;
    /** structuredData.connection (志望校との接続)。空文字なら未生成 */
    connection: string;
  }>;
  /** 全件 (英検以外も含む) */
  englishCerts: Array<{
    type: string;
    score: string;
  }>;
}

const EMPTY_CONTEXT: StudentContext = {
  primaryTargets: [],
  selfAnalysis: null,
  mbtiType: null,
  recentActivities: [],
  englishCerts: [],
};

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function loadPrimaryTargets(
  adminDb: Firestore,
  targetUniversities: string[] | undefined,
): Promise<StudentContext["primaryTargets"]> {
  if (!targetUniversities || targetUniversities.length === 0) return [];

  const heads = targetUniversities.slice(0, 3);
  const parsed = heads
    .map((compound) => {
      const [univId, facId] = compound.split(":");
      if (!univId || !facId) return null;
      return { univId, facId };
    })
    .filter((x): x is { univId: string; facId: string } => x !== null);

  if (parsed.length === 0) return [];

  // universities/{univId} をまとめて取得 (Promise.all)
  const docs = await Promise.all(
    parsed.map((p) =>
      adminDb
        .doc(`universities/${p.univId}`)
        .get()
        .catch(() => null),
    ),
  );

  const out: StudentContext["primaryTargets"] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const snap = docs[i];
    if (!snap?.exists) continue;
    const univ = snap.data() as Partial<University> | undefined;
    if (!univ) continue;
    const faculty = (univ.faculties ?? []).find(
      (f: Faculty) => f.id === parsed[i].facId,
    );
    if (!faculty) continue;
    out.push({
      universityName: univ.name ?? "",
      facultyName: faculty.name ?? "",
      // AP 原文は長くなりがちなのでプロンプト爆発を避けて 500 字に切る
      admissionPolicy: truncate(faculty.admissionPolicy ?? "", 500),
    });
  }
  return out;
}

async function loadSelfAnalysisSummary(
  adminDb: Firestore,
  studentId: string,
): Promise<StudentContext["selfAnalysis"]> {
  try {
    const snap = await adminDb.doc(`selfAnalysis/${studentId}`).get();
    if (!snap.exists) return null;
    const data = snap.data() as {
      values?: { coreValues?: string[] };
      strengths?: { uniqueCombo?: string };
      interests?: { fields?: string[] };
      vision?: { shortTermGoal?: string };
      identity?: { apConnection?: string };
    };
    return {
      coreValues: data.values?.coreValues ?? [],
      uniqueCombo: data.strengths?.uniqueCombo ?? "",
      interests: data.interests?.fields ?? [],
      shortTermGoal: data.vision?.shortTermGoal ?? "",
      apConnection: data.identity?.apConnection ?? "",
    };
  } catch (e) {
    console.warn(`[loadStudentContext] selfAnalysis fetch failed for ${studentId}:`, e);
    return null;
  }
}

async function loadRecentActivities(
  adminDb: Firestore,
  studentId: string,
): Promise<StudentContext["recentActivities"]> {
  try {
    const snap = await adminDb
      .collection(`users/${studentId}/activities`)
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as {
        title?: string;
        category?: string;
        description?: string;
        structuredData?: { connection?: string };
      };
      return {
        title: data.title ?? "",
        category: data.category ?? "",
        summary: truncate(data.description ?? "", 200),
        connection: data.structuredData?.connection ?? "",
      };
    });
  } catch (e) {
    console.warn(`[loadStudentContext] activities fetch failed for ${studentId}:`, e);
    return [];
  }
}

/**
 * 生徒の個別文脈 (志望校・自己分析・MBTI・活動・資格) を Firestore から一括取得する。
 *
 * 個々の取得は try/catch で包んでいるので、1 つこけても他の取得は継続する。
 * 完全失敗時は空 context を返してプロンプト側でセクション省略させる。
 */
export async function loadStudentContext(
  adminDb: Firestore,
  studentId: string,
): Promise<StudentContext> {
  try {
    const studentSnap = await adminDb.doc(`users/${studentId}`).get();
    if (!studentSnap.exists) return EMPTY_CONTEXT;
    const student = studentSnap.data() as {
      targetUniversities?: string[];
      mbtiType?: string;
      englishCerts?: Array<{ type?: string; score?: string }>;
    };

    const [primaryTargets, selfAnalysis, recentActivities] = await Promise.all([
      loadPrimaryTargets(adminDb, student.targetUniversities),
      loadSelfAnalysisSummary(adminDb, studentId),
      loadRecentActivities(adminDb, studentId),
    ]);

    return {
      primaryTargets,
      selfAnalysis,
      mbtiType:
        typeof student.mbtiType === "string" && /^[EI][SN][TF][JP]$/.test(student.mbtiType)
          ? student.mbtiType
          : null,
      recentActivities,
      englishCerts: (student.englishCerts ?? [])
        .filter((c) => c && typeof c.type === "string")
        .map((c) => ({
          type: c.type ?? "",
          score: c.score ?? "",
        })),
    };
  } catch (e) {
    console.warn(`[loadStudentContext] top-level error for ${studentId}:`, e);
    return EMPTY_CONTEXT;
  }
}
