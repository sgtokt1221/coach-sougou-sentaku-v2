import type { SelfAnalysisContext } from "@/lib/ai/prompts/document";
import type { StructuredActivityData } from "@/lib/types/activity";

/**
 * 書類のAI処理に渡す「その生徒の材料」を1か所で読む。
 *
 * これまでは経路ごとにバラバラで、生成の入口だけが活動実績を読み、
 * 添削・セクションコーチ・書き換えは一度も読んでいなかった。逆に活動実績から
 * 作る下書きは自己分析を読んでいない。結果として、どのボタンを押しても
 * 生徒が登録した材料の半分しか使われていなかった。
 *
 * 読む場所が経路ごとに散っているとまた片方だけ直して同じズレが戻るので、
 * 自己分析・活動実績の取得はこのファイルに集める。
 */

/** プロンプトに載せる活動実績。Firestore の生データではなく必要な分だけ */
export interface ActivityContext {
  id: string;
  title: string;
  category?: string;
  period?: string;
  description?: string;
  structuredData?: StructuredActivityData;
}

export interface StudentDocumentContext {
  selfAnalysis?: SelfAnalysisContext;
  activities: ActivityContext[];
}

/**
 * プロンプトに載せる活動実績の上限。
 * 添削は入力6千トークン程度で回っているので、材料で膨らませすぎないための歯止め。
 */
const MAX_ACTIVITIES = 12;
/** 1件あたりの自由記述の上限。構造化前の下書きが長文のことがある */
const MAX_DESCRIPTION_CHARS = 300;

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function truncate(value: unknown, max: number): string | undefined {
  const text = stringValue(value);
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 自己分析ドキュメントを、プロンプトが受け取る形に均す */
export function mapSelfAnalysis(
  raw: Record<string, unknown>
): SelfAnalysisContext {
  const obj = (key: string) =>
    raw[key] && typeof raw[key] === "object"
      ? (raw[key] as Record<string, unknown>)
      : {};
  const values = obj("values");
  const strengths = obj("strengths");
  const vision = obj("vision");
  const identity = obj("identity");

  return {
    values: stringArray(values.coreValues),
    strengths: stringArray(strengths.strengths),
    vision: stringValue(vision.longTermVision),
    selfStatement: stringValue(identity.selfStatement),
    uniqueNarrative: stringValue(identity.uniqueNarrative),
  };
}

/**
 * 自己分析を読む。現行の保存先を優先し、旧形式のサブコレクションも見る。
 * セクションコーチは新しい方しか見ていなかったので、旧形式のまま止まっている
 * 生徒では材料なしで会話していた。
 */
export async function loadSelfAnalysisContext(
  uid: string
): Promise<SelfAnalysisContext | undefined> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return undefined;

  try {
    let snap = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (!snap.exists) {
      snap = await adminDb.doc(`users/${uid}/selfAnalysis/current`).get();
    }
    if (!snap.exists) return undefined;
    return mapSelfAnalysis(snap.data()!);
  } catch (err) {
    // 材料が欠けても書類の処理自体は続ける（落とすと添削ごと失敗する）
    console.warn("[documents] selfAnalysis の取得に失敗:", err);
    return undefined;
  }
}

/**
 * 活動実績を読む。
 * @param ids 指定があればその活動だけに絞る（下書き生成で生徒が選んだもの）
 */
export async function loadActivityContexts(
  uid: string,
  ids?: string[] | null
): Promise<ActivityContext[]> {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return [];

  try {
    const snap = await adminDb.collection(`users/${uid}/activities`).get();
    const wanted = ids && ids.length > 0 ? new Set(ids) : null;

    return snap.docs
      .filter((doc) => !wanted || wanted.has(doc.id))
      .map((doc) => {
        const x = doc.data();
        const start = stringValue(x.period?.start);
        const end = stringValue(x.period?.end);
        return {
          id: doc.id,
          title: stringValue(x.title) ?? "活動実績",
          category: stringValue(x.category),
          period: start || end ? `${start ?? "?"}〜${end ?? "?"}` : undefined,
          description: truncate(x.description, MAX_DESCRIPTION_CHARS),
          structuredData: (x.structuredData as StructuredActivityData) ?? undefined,
        };
      })
      .slice(0, MAX_ACTIVITIES);
  } catch (err) {
    console.warn("[documents] activities の取得に失敗:", err);
    return [];
  }
}

/** 自己分析と活動実績をまとめて読む */
export async function loadStudentDocumentContext(
  uid: string,
  activityIds?: string[] | null
): Promise<StudentDocumentContext> {
  const [selfAnalysis, activities] = await Promise.all([
    loadSelfAnalysisContext(uid),
    loadActivityContexts(uid, activityIds),
  ]);
  return { selfAnalysis, activities };
}
