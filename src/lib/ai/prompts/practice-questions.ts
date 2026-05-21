/**
 * 成長レポートに付属する「次に取り組む類題」の system prompt ビルダー。
 *
 * 生徒の弱点と過去に取り組んだテーマ・質問を入力すると、
 * 弱点補強につながる小論文テーマと面接質問を短文で生成する。
 *
 * 出力は厳格な JSON で:
 * {
 *   essayQuestions: [{ id, title, relatedWeakness, relatedPastTopic? }, ...],
 *   interviewQuestions: [{ id, title, relatedWeakness, relatedPastTopic? }, ...]
 * }
 */

export interface PracticeQuestionsContext {
  studentName: string;
  /** 弱点 (上位 5 件) */
  weaknesses: string[];
  /** 過去 5〜10 件の小論文テーマ */
  pastEssayTopics: string[];
  /** 過去の主要面接質問 (10 件以内) */
  pastInterviewQuestions: string[];
  /** 小論文で最も弱いカテゴリ (任意) */
  worstCategory?: string;
}

export function buildPracticeQuestionsPrompt(ctx: PracticeQuestionsContext): string {
  const weaknessSection =
    ctx.weaknesses.length > 0
      ? ctx.weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")
      : "(明示的な弱点なし)";

  const pastTopicSection =
    ctx.pastEssayTopics.length > 0
      ? ctx.pastEssayTopics.slice(0, 8).map((t) => `- ${t}`).join("\n")
      : "(過去テーマの記録なし)";

  const pastInterviewSection =
    ctx.pastInterviewQuestions.length > 0
      ? ctx.pastInterviewQuestions.slice(0, 8).map((q) => `- ${q}`).join("\n")
      : "(過去面接質問の記録なし)";

  const worstLine = ctx.worstCategory
    ? `\n- 小論文の特に弱いカテゴリ: ${ctx.worstCategory}`
    : "";

  return `あなたは、総合型選抜 (旧 AO 入試) 対策の塾講師です。${ctx.studentName} さんの弱点を補強し、次の授業や自学で取り組むための「類題」を提案します。

## 生徒の弱点 (上位 5 件)
${weaknessSection}${worstLine}

## 過去に取り組んだ小論文テーマ
${pastTopicSection}

## 過去の主要な面接質問
${pastInterviewSection}

## あなたのタスク
以下の形式の **JSON のみ** を出力してください。それ以外の説明文や前置きは禁止です。

- 小論文用の類題 (\`essayQuestions\`) を **3 件**
- 面接用の類題 (\`interviewQuestions\`) を **3 件**

それぞれの \`title\` は **30〜50 字程度の短文**。冗長な前置き不要、テーマ・質問の本体のみ。
\`relatedWeakness\` には「なぜこれを薦めるか」を 1 文 (20-40 字) で簡潔に書きます。
過去テーマと完全一致せず、新しい切り口で。ただし関連性がある場合は \`relatedPastTopic\` でその過去テーマを引用してよい。

## 出力フォーマット
\`\`\`json
{
  "essayQuestions": [
    {
      "id": "pq_e1",
      "title": "あなたが地域社会で果たすべき役割について述べよ。",
      "relatedWeakness": "独自性の不足を補強",
      "relatedPastTopic": "地域貢献について"
    }
  ],
  "interviewQuestions": [
    {
      "id": "pq_i1",
      "title": "あなたの価値観が形成された原体験を 1 分で話してください。",
      "relatedWeakness": "具体性の不足を補強"
    }
  ]
}
\`\`\`

JSON のみを出力してください。`;
}
