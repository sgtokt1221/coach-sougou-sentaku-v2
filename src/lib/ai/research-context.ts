import { adminDb } from "@/lib/firebase/admin";

/**
 * 探究カリキュラムの分野提案・生成に渡す「生徒の自己理解」コンテキストを集める。
 * 既存の自己分析(selfAnalysis)・MBTI・活動実績・プロフィール興味を読み込み、
 * プロンプトに注入できる日本語テキストにまとめる。専用の「自分発見」は作らず流用する方針。
 */
export interface ResearchSelfContext {
  /** プロンプト注入用のまとめテキスト（空なら自己分析データ無し） */
  text: string;
  /** 自己分析(7ステップ)が完了しているか */
  selfAnalysisComplete: boolean;
}

export async function loadResearchSelfContext(uid: string): Promise<ResearchSelfContext> {
  if (!adminDb) return { text: "", selfAnalysisComplete: false };

  const parts: string[] = [];
  let selfAnalysisComplete = false;

  try {
    const [userSnap, saSnap, actsSnap] = await Promise.all([
      adminDb.doc(`users/${uid}`).get(),
      adminDb.doc(`selfAnalysis/${uid}`).get(),
      adminDb.collection(`users/${uid}/activities`).limit(10).get(),
    ]);

    const user = userSnap.data() ?? {};
    if (user.mbtiType) parts.push(`MBTIタイプ: ${user.mbtiType}`);
    if (Array.isArray(user.interests) && user.interests.length > 0) {
      parts.push(`登録済みの興味: ${user.interests.join(", ")}`);
    }

    const sa = saSnap.data();
    if (sa) {
      selfAnalysisComplete = sa.isComplete === true;
      const interests = sa.interests ?? {};
      if (Array.isArray(interests.fields) && interests.fields.length > 0) {
        parts.push(`自己分析・興味分野: ${interests.fields.join(", ")}`);
      }
      if (Array.isArray(interests.deepDiveTopics) && interests.deepDiveTopics.length > 0) {
        parts.push(`深掘りしたテーマ: ${interests.deepDiveTopics.join(", ")}`);
      }
      const values = sa.values ?? {};
      if (Array.isArray(values.coreValues) && values.coreValues.length > 0) {
        parts.push(`価値観: ${values.coreValues.join(", ")}`);
      }
      const strengths = sa.strengths ?? {};
      if (Array.isArray(strengths.strengths) && strengths.strengths.length > 0) {
        parts.push(`強み: ${strengths.strengths.join(", ")}`);
      }
      const vision = sa.vision ?? {};
      if (vision.longTermVision) parts.push(`将来ビジョン: ${vision.longTermVision}`);
      if (vision.whyThisField) parts.push(`進みたい理由: ${vision.whyThisField}`);
    }

    if (!actsSnap.empty) {
      const acts = actsSnap.docs
        .map((d) => {
          const a = d.data();
          const conn = a.structuredData?.connection ? `（${a.structuredData.connection}）` : "";
          return a.title ? `${a.title}${conn}` : null;
        })
        .filter(Boolean);
      if (acts.length > 0) parts.push(`活動実績: ${acts.join(" / ")}`);
    }
  } catch (e) {
    console.error("loadResearchSelfContext failed:", e);
  }

  return { text: parts.join("\n"), selfAnalysisComplete };
}
