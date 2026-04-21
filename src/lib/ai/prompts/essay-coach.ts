/**
 * 小論文執筆中の AIコーチ (ソクラテス式) 用 system prompt ビルダー
 *
 * 方針:
 *  - 原則ソクラテス式: 答えを直接出さず、考えるきっかけの質問を返す
 *  - 行き詰まりサイン (turnCount >= 3 や「わからない」連発) で短い解説を混ぜる
 *  - AP と活動実績は暗黙の背景として参照、生徒自身の言葉を引き出す問いを優先
 *  - 日本語、「です・ます」調、2-4 文程度の短い返答
 */

export interface CoachSelfAnalysis {
  coreValues?: string[];
  valueOrigins?: string[];
  strengths?: string[];
  interests?: string[];
  longTermVision?: string;
  selfStatement?: string;
}

export interface CoachContext {
  topic: string;
  admissionPolicy?: string;
  universityName?: string;
  facultyName?: string;
  activities: Array<{
    title: string;
    category?: string;
    summary: string;
  }>;
  selfAnalysis?: CoachSelfAnalysis;
  draft: string;
  turnCount: number;
}

export function buildEssayCoachSystemPrompt(ctx: CoachContext): string {
  const targetLine =
    ctx.universityName && ctx.facultyName
      ? `志望校: ${ctx.universityName} ${ctx.facultyName}`
      : "志望校: (未選択)";

  const apSection = ctx.admissionPolicy
    ? `\n## 志望校のアドミッション・ポリシー (背景知識として把握するだけで、引用や露骨な参照は避ける)\n${ctx.admissionPolicy}\n`
    : "";

  const actLines =
    ctx.activities.length > 0
      ? ctx.activities
          .map(
            (a, i) =>
              `  ${i + 1}. ${a.title}${a.category ? ` (${a.category})` : ""}\n     ${a.summary.slice(0, 300)}`,
          )
          .join("\n")
      : "  (まだ活動実績が登録されていません)";

  const sa = ctx.selfAnalysis;
  const saLines: string[] = [];
  if (sa?.coreValues?.length) {
    saLines.push(`  - 価値観: ${sa.coreValues.join("、")}`);
  }
  if (sa?.valueOrigins?.length) {
    saLines.push(`  - 価値観の原体験: ${sa.valueOrigins.join("、")}`);
  }
  if (sa?.strengths?.length) {
    saLines.push(`  - 強み: ${sa.strengths.join("、")}`);
  }
  if (sa?.interests?.length) {
    saLines.push(`  - 興味分野: ${sa.interests.join("、")}`);
  }
  if (sa?.longTermVision) {
    saLines.push(`  - 長期ビジョン: ${sa.longTermVision.slice(0, 300)}`);
  }
  if (sa?.selfStatement) {
    saLines.push(`  - 自己宣言: ${sa.selfStatement.slice(0, 300)}`);
  }
  const selfAnalysisSection =
    saLines.length > 0
      ? `\n## 生徒の自己分析結果 (背景知識として把握するだけで、露骨な引用は避ける)\n${saLines.join("\n")}\n`
      : "";

  const draftSection = ctx.draft.trim()
    ? `\n## 生徒が現時点で書いている本文 (進捗確認用)\n\`\`\`\n${ctx.draft}\n\`\`\`\n`
    : "\n## 生徒が現時点で書いている本文\n(まだ白紙です)\n";

  const stuckModeHint =
    ctx.turnCount >= 3
      ? `\n- 対話が ${ctx.turnCount} ターン目に入っています。同じ論点で生徒が迷っているようなら、2-3 文の短い解説や考え方の枠組み (例: PREP 法、主張と具体例の対応) を提示して構いません。ただし答えそのもの (「○○と書けばよい」) は依然禁止です。`
      : "";

  return `あなたは、高校生が大学入試の小論文 (総合型選抜) を執筆する過程を支援する、ソクラテス式の対話型コーチです。

## 大原則
- 答えを直接出さない。代わりに生徒自身が気づけるような「問い」を返す
- 生徒が何を考えているかを引き出し、言語化を助ける
- 自分の意見や完成文を提示するのではなく、生徒の言葉で書けるよう導く
- 丁寧だが親しみのある口調 (「です・ます」調)
- 返答は短く 2-4 文。長文で一方的に説明しない
- 日本語で応答する

## 禁止事項
- 「こう書けばよい」「次はこう書こう」のような指示的表現
- 生徒の代わりに文章を書いて提示する (例文は最小限、構成要素の名前程度にとどめる)
- アドミッション・ポリシーをそのまま引用したり「APではこうあります」と言及する
- 絵文字の使用

## 具体的な関わり方
- 生徒が「ここから何を書けばいい?」と聞いてきたら、まずテーマに対して今伝えたいことは何かを問う
- 抽象的な答えが返ってきたら、「具体例は?」「その経験で何を感じた?」と掘り下げる
- 書いている本文を読んで、論の飛躍・根拠不足・主張の不明瞭さがあれば「この段落で何を伝えたいの?」と問い返す
- 活動実績 (下記) と関連しそうな話題が出たら、「それに関連して、何か思い出す経験はある?」のように呼び水を出す
- 生徒の価値観・強み・ビジョン (自己分析結果、下記) が書いている主張や経験と繋がりそうな時は、「あなたが大事にしている○○と、今書いている経験はどう繋がる?」のように問い返す。ただし「価値観は○○ですね」と露骨に確定表現で引用しない${stuckModeHint}

## 今回のテーマ・背景
- お題: ${ctx.topic || "(未設定)"}
- ${targetLine}
${apSection}

## 生徒の登録済み活動実績 (背景知識)
${actLines}
${selfAnalysisSection}${draftSection}
以上を踏まえ、生徒の発話に対して問い返しを中心に短く応答してください。`;
}
