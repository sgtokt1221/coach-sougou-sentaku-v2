/**
 * 成長レポートに付属する「次に取り組む類題」の system prompt ビルダー。
 *
 * 設計の核: 類題は「授業 1 コマで取り組み、今週の弱点を直接克服する」もの。
 * - primary (授業中・必須 modelAnswer): 小論文 1 + 面接 2
 * - secondary (宿題・modelAnswer 任意): 小論文 1 + 面接 1
 *
 * 出力は厳格な JSON で:
 * {
 *   primaryQuestions: [{ id, type, title, relatedWeakness, modelAnswer, ... }],
 *   secondaryQuestions: [{ id, type, title, relatedWeakness, modelAnswer?, ... }]
 * }
 */

export interface PracticeQuestionsContext {
  studentName: string;
  /** 今週の essay でスコアが低かった項目 (下位 3 つ程度、最重要) */
  thisWeekWeakItems: Array<{ area: string; avgScore: number; essayCount: number }>;
  /** 今週取り組んだ小論文テーマ */
  thisWeekEssayTopics: string[];
  /** 今週の面接で投げられた主要質問 */
  thisWeekInterviewQuestions: string[];
  /** 慢性弱点 (期間横断、補助情報) */
  chronicWeaknesses: string[];
  /** 過去テーマ (重複回避用) */
  pastEssayTopics: string[];
}

export function buildPracticeQuestionsPrompt(ctx: PracticeQuestionsContext): string {
  const thisWeekWeakSection =
    ctx.thisWeekWeakItems.length > 0
      ? ctx.thisWeekWeakItems
          .map(
            (w, i) =>
              `${i + 1}. ${w.area} (平均 ${w.avgScore}/10、${w.essayCount} 件中)`,
          )
          .join("\n")
      : "(今週の essay スコア記録なし)";

  const thisWeekEssaySection =
    ctx.thisWeekEssayTopics.length > 0
      ? ctx.thisWeekEssayTopics.map((t) => `- ${t}`).join("\n")
      : "(今週の小論文取り組み記録なし)";

  const thisWeekInterviewSection =
    ctx.thisWeekInterviewQuestions.length > 0
      ? ctx.thisWeekInterviewQuestions
          .slice(0, 5)
          .map((q) => `- ${q}`)
          .join("\n")
      : "(今週の面接記録なし)";

  const chronicSection =
    ctx.chronicWeaknesses.length > 0
      ? ctx.chronicWeaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")
      : "(慢性弱点の記録なし)";

  const pastTopicsSection =
    ctx.pastEssayTopics.length > 0
      ? ctx.pastEssayTopics
          .slice(0, 8)
          .map((t) => `- ${t}`)
          .join("\n")
      : "(過去テーマの記録なし)";

  return `あなたは総合型選抜対策の塾講師です。${ctx.studentName} さんが「次の 1 週間で授業中に取り組む類題」を提案します。

## 最優先指針
今週の取り組みで現れた弱点を **直接克服する** 類題を作ること。
慢性弱点は補助情報。今週データが空の時のみメインに使ってよい。

## 今週スコアが低かった項目 (最重要、ここから優先的に類題を作る)
${thisWeekWeakSection}

## 今週取り組んだ小論文テーマ (この延長線か、別の切り口で攻める)
${thisWeekEssaySection}

## 今週の主要面接質問
${thisWeekInterviewSection}

## 慢性弱点 (期間横断、補助)
${chronicSection}

## 過去テーマ (重複回避用、これと完全に同じテーマは禁止)
${pastTopicsSection}

## あなたのタスク
**JSON のみ** を出力してください。説明文や前置きは禁止です。

- **primary** (授業中必須、**絶対に計 3 件出すこと**):
  - 小論文 1 件 + 面接 2 件
  - modelAnswer **必須** (省略禁止)
- **secondary** (宿題用、計 2 件):
  - 小論文 1 件 + 面接 1 件
  - modelAnswer **必須** (省略禁止)

### 絶対要件 (違反厳禁)
- **primaryQuestions を 0 件にして返すことは絶対に禁止**。必ず 3 件出す
- **全類題に modelAnswer を必ず含める** (primary / secondary 問わず空禁止)
- 各類題に **relatedWeakness を必ず含める** (空禁止)
- 「今週の [テーマ名] で [項目] が X 点だったので、これを練習する」「今週の [質問] でつまった具体性を補強する」のように、**今週の事実とリンク**させて書く
- title は 30〜50 字程度の短文 (テーマ・質問の本体のみ)
- 過去テーマと完全に同じ題は禁止 (切り口を変えた再挑戦は推奨)

### modelAnswer の文字数基準 (JSON 切れを防ぐため簡潔に)
- **primary 小論文**: 350-450 字。主張 (80) / 理由 (120) / 具体例 (150) / 結論 (50) の構成
- **primary 面接**: 80-120 字。要点のみ、話し言葉で
- **secondary 小論文**: 200-280 字。主張 + 理由 + 具体例の骨子のみ
- **secondary 面接**: 60-100 字。要点のみ

合計文字数の目安: 約 1500 字以内に収め、JSON が出力途中で切れないようにする。

### データ不足時の方針
今週の弱点・テーマが乏しくても、慢性弱点や総合型選抜の頻出テーマから選んで **必ず計 5 件 (primary 3 + secondary 2) を生成**。空配列で返すことは絶対に禁止。

## 出力フォーマット
\`\`\`json
{
  "primaryQuestions": [
    {
      "id": "pq_p_1",
      "type": "essay",
      "title": "あなたが社会で果たすべき役割について、500字以内で論じよ。",
      "relatedWeakness": "今週の論理性が 4.5/10 だったので、主張→理由→具体例の構成練習",
      "relatedPastTopic": "地域貢献について",
      "modelAnswer": "私は地域社会で...(400-500字の構成完成例)"
    }
  ],
  "secondaryQuestions": [
    {
      "id": "pq_s_1",
      "type": "interview",
      "title": "高校時代で最も成長したと感じた瞬間は？",
      "relatedWeakness": "今週の具体性スコア低下を補うエピソード抽出練習",
      "modelAnswer": "(60-100 字の解答例)"
    }
  ]
}
\`\`\`

JSON のみを出力してください。`;
}
