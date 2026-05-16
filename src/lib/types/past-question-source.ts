/**
 * 過去問の動的生成 sourceText (AI 生成サンプル課題文) のキャッシュ型。
 * Firestore コレクション `pastQuestionSourceTexts/{questionId}` に保存される。
 */
export interface CachedSourceText {
  /** PastQuestion.id と同一 */
  id: string;
  /** 生成された課題文本文 + 設問 */
  sourceText: string;
  /** 常に true (AI 生成サンプルのため) */
  isSample: true;
  /** 生成時刻 (Firestore Timestamp / Date / ISO string のいずれか) */
  generatedAt: { seconds: number; nanoseconds: number } | Date | string;
  /** 使用した Claude モデル ID */
  model: string;
}

/** API レスポンス型 */
export interface PastQuestionSourceTextResponse {
  sourceText: string;
  /** true: AI 生成のサンプル / false: 実問題文 */
  isSample: boolean;
}
