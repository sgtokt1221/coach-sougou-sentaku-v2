import type { HelpfulContext } from "./essay-past-questions";

/**
 * 過去問 id → 練習用に補完した「論述のための背景知識」マップ。
 *
 * AI バッチ (`scripts/refine-past-questions.ts`) で生成・追記する。
 * 静的データ `essay-past-questions.ts` 本体は触らないことでデータ管理を分離する。
 *
 * 優先順位 (essay-past-questions.ts の `getEnrichedPastQuestions()` で適用):
 * - inline `helpfulContext` (essay-past-questions.ts に直書き、 手作業実装分) を最優先
 * - inline が無い場合のみここの map を fallback として使用
 */
export const PAST_QUESTION_HELPFUL_CONTEXTS: Record<string, HelpfulContext> = {
  // AI バッチで追記される
};
