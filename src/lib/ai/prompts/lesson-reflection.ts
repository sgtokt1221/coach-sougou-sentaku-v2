/**
 * 授業の文字起こし (話者分離) から「反省点/課題・次回やること・新しい弱点」を
 * 抽出する system prompt。録音終了後に自動実行し、debrief の下書きを作る。
 *
 * 出力は厳格な JSON:
 * {
 *   "reflectionPoints": ["この授業で見えた課題/反省点", ...],
 *   "nextAgendaSeed": "次回の授業でまず取り組むべきこと (1-3文)",
 *   "newWeaknessAreas": ["新たに観察された弱点 (短い名詞句)", ...]
 * }
 */

export interface LessonReflectionContext {
  studentName: string;
  /** 今回の授業ゴール (prepPlan.goal) */
  lessonGoal?: string;
  /** 話者ラベル付き文字起こし ([講師]/[生徒]) */
  transcript: string;
}

export function buildLessonReflectionPrompt(ctx: LessonReflectionContext): string {
  return `あなたは総合型選抜対策塾のベテラン講師です。${ctx.studentName} さんの授業の文字起こし ([講師]/[生徒] の話者ラベル付き) を読み、次回授業に活かす「振り返り」を作成します。

## 入力
- 今回のゴール: ${ctx.lessonGoal?.slice(0, 300) || "(記録なし)"}
- 文字起こし:
${ctx.transcript.slice(0, 12000)}

## 出力形式 (JSON のみ。前後に説明文を入れない)
\`\`\`json
{
  "reflectionPoints": ["この授業で見えた課題・反省点を簡潔に", "..."],
  "nextAgendaSeed": "次回の授業でまず取り組むべきことを 1-3 文で",
  "newWeaknessAreas": ["新たに観察された弱点を短い名詞句で", "..."]
}
\`\`\`

## 方針
- **reflectionPoints**: 2-5 個。授業中に露呈した理解の穴・つまずき・伸ばすべき点を、事実に基づいて具体的に。生徒を断罪せず「次にどう活かすか」の観点で。
- **nextAgendaSeed**: 今回の続き・宿題の確認・未消化テーマなど、次回冒頭で扱うべきことを簡潔に。
- **newWeaknessAreas**: 今回新たに見えた弱点のみ (例: 「具体例の不足」「結論の一貫性」)。無ければ空配列。各要素は 20 字以内の名詞句。
- 文字起こしが乏しい/雑談中心で根拠が薄い場合は、無理に作らず該当配列を短く/空にする。
- 日本語、講師向けの簡潔体。

上記を踏まえ、JSON のみを出力してください。`;
}
