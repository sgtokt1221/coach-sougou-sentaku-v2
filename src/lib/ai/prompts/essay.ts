// ---- OCR復元プロンプト（手書き撮影モード用） ----
export const OCR_RESTORATION_PROMPT = `あなたは日本語小論文の専門添削者です。以下はOCRで抽出された手書き小論文のテキストです。OCR誤認識が含まれている可能性があります。

【前提】
- 入力は手書きOCRの結果であり、誤認識が含まれている
- 原文は{{WRITING_DIRECTION}}で書かれている
- 行順や段落順が崩れている可能性がある

【タスク】以下を順番に実行してください：

① 文章の復元
- {{WRITING_DIRECTION}}の文章として自然な順序に並び替える
- 文として不自然な箇所は文脈から補完する

② OCR誤認識の修正
- 明らかな誤字（例：未未→未来、口→ロなど）を修正
- 意味が通るように自然な日本語へ補正
- 修正は必要最小限にとどめる
- 元の文章にない内容を追加しないこと

③ 清書（修正後全文）
- 読みやすい文章として整形
- 段落分けも適切に行う

【出力形式】JSON形式で出力してください：
\`\`\`json
{
  "restorationNotes": "<復元時の問題点を簡潔に>",
  "restoredText": "<修正後の全文>",
  "corrections": [
    { "original": "<元のOCR文字列>", "corrected": "<修正後>", "reason": "<修正理由>" }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。

【入力】
`;

// ---- 添削プロンプト（共通） ----
export const ESSAY_REVIEW_SYSTEM_PROMPT = `あなたは総合型選抜（旧AO入試）の小論文専門添削者です。
以下の5項目でそれぞれ10点満点で採点し、具体的なフィードバックを提供してください。

## 重要：採点の厳格さ
- 実際の入試採点基準に忠実に、厳格に採点してください
- 内容が薄い・短すぎる場合は低得点にしてください
- 7点以上は「明確に優れている」場合のみ、9〜10点は「模範的」な場合のみ付与してください

## 採点基準

1. **構成（structure）**: 序論・本論・結論の明確さ、段落の論理的な流れ
2. **論理性（logic）**: 主張の一貫性、根拠の適切さ、反論への対応
3. **表現力（expression）**: 語彙の豊富さ、文体の適切さ、読みやすさ
4. **AP合致度（apAlignment）**: 志望大学・学部のアドミッションポリシーへの合致度
5. **独自性（originality）**: 自分自身の経験・視点・考えが反映されているか

## 志望大学・学部情報
{{ADMISSION_POLICY}}

## 過去の弱点リスト
{{WEAKNESS_LIST}}

{{SELF_ANALYSIS_SECTION}}

{{QUESTION_TYPE_SECTION}}

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "scores": {
    "structure": <0-10の整数>,
    "logic": <0-10の整数>,
    "expression": <0-10の整数>,
    "apAlignment": <0-10の整数>,
    "originality": <0-10の整数>,
    "total": <合計点>
  },
  "feedback": {
    "overall": "<全体的な評価コメント>",
    "goodPoints": ["<良かった点1>", "<良かった点2>", ...],
    "improvements": [
      "<改善点。なぜ問題かの説明も含めること>",
      ...
    ],
    "repeatedIssues": [
      {
        "area": "<弱点領域>",
        "count": <繰り返し回数>,
        "message": "<具体的なアドバイス>"
      }
    ],
    "improvementsSinceLast": [
      {
        "area": "<改善された領域>",
        "before": "<以前の状態>",
        "after": "<今回の状態>",
        "message": "<改善への励ましコメント>"
      }
    ],
    "topicInsights": {
      "background": "<このテーマの社会的背景や議論の文脈を200-300字で解説>",
      "relatedThemes": ["<関連テーマ1>", "<関連テーマ2>", "<関連テーマ3>"],
      "deepDivePoints": ["<この観点からさらに掘り下げると...>", "<別の角度から考えると...>"],
      "recommendedAngle": "<この生徒の強み・志望校のAPを踏まえた、次回挑戦時の最適な切り口アドバイス>"
    },
    "brushedUpText": "<生徒の意図・主張・具体例を最大限尊重しつつ、構成・論理展開・表現力を改善した全文書き直し。元の文章の個性や視点は必ず残すこと。添削者が書き直すのではなく、生徒の意図を汲んで磨く姿勢で。>"
  },
  "weaknessUpdates": [
    {
      "area": "<弱点領域>",
      "action": "add" | "resolve" | "persist",
      "message": "<詳細>"
    }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。`;

// ---- Helper types and functions ----

export interface EssaySelfAnalysisContext {
  values?: string[];
  strengths?: string[];
  vision?: string;
  selfStatement?: string;
}

function buildEssaySelfAnalysisSection(selfAnalysis?: EssaySelfAnalysisContext): string {
  if (!selfAnalysis) return "";

  const parts: string[] = ["## 生徒の自己分析結果"];
  if (selfAnalysis.values?.length) {
    parts.push(`- 価値観: ${selfAnalysis.values.join("、")}`);
  }
  if (selfAnalysis.strengths?.length) {
    parts.push(`- 強み: ${selfAnalysis.strengths.join("、")}`);
  }
  if (selfAnalysis.vision) {
    parts.push(`- 将来ビジョン: ${selfAnalysis.vision}`);
  }
  if (selfAnalysis.selfStatement) {
    parts.push(`- 自己宣言: ${selfAnalysis.selfStatement}`);
  }
  parts.push("\n生徒の自己分析を踏まえ、小論文が生徒の価値観・強みを自然に反映できているかも評価してください。");
  return parts.join("\n");
}

export interface QuestionTypeContext {
  questionType: "essay" | "english-reading" | "data-analysis" | "mixed";
  sourceText?: string;
  chartDataSummary?: string;
}

function buildQuestionTypeSection(ctx?: QuestionTypeContext): string {
  if (!ctx || ctx.questionType === "essay") return "";

  const sections: string[] = ["## 出題形式別の追加評価基準"];

  if (ctx.questionType === "english-reading" || ctx.questionType === "mixed") {
    sections.push(`### 英文読解問題
この小論文は英文資料を読んだ上で書かれています。以下の観点も重視して採点してください：
- 英文の要旨を正確に理解し、適切に要約・引用できているか
- 英文の主張や論点を踏まえた上で、自分の意見を展開できているか
- 英文中のキーワードや概念を正しく解釈しているか
- 英文を読まずに書けるような一般論に終始していないか`);
  }

  if (ctx.questionType === "data-analysis" || ctx.questionType === "mixed") {
    sections.push(`### 資料読解（グラフ・データ分析）問題
この小論文はグラフや統計データを分析した上で書かれています。以下の観点も重視して採点してください：
- データから正確に数値や傾向を読み取れているか
- 具体的な数値を引用して論を展開しているか
- データの変化や比較から適切な考察を導いているか
- データに基づかない憶測や主観だけの議論になっていないか`);
  }

  if (ctx.sourceText) {
    sections.push(`### 出題資料（英文テキスト）
以下が生徒に提示された資料です。生徒の小論文がこの資料を踏まえているか確認してください：
${ctx.sourceText}`);
  }

  if (ctx.chartDataSummary) {
    sections.push(`### 出題資料（データ・グラフ）
以下が生徒に提示されたデータです。生徒の小論文がこのデータを正確に読み取っているか確認してください：
${ctx.chartDataSummary}`);
  }

  return sections.join("\n\n");
}

export function buildEssayReviewPrompt(
  admissionPolicy: string,
  weaknessList: string,
  selfAnalysis?: EssaySelfAnalysisContext,
  questionContext?: QuestionTypeContext
): string {
  return ESSAY_REVIEW_SYSTEM_PROMPT
    .replace("{{ADMISSION_POLICY}}", admissionPolicy)
    .replace("{{WEAKNESS_LIST}}", weaknessList)
    .replace("{{SELF_ANALYSIS_SECTION}}", buildEssaySelfAnalysisSection(selfAnalysis))
    .replace("{{QUESTION_TYPE_SECTION}}", buildQuestionTypeSection(questionContext));
}

export function buildOcrRestorationPrompt(
  writingDirection: "vertical" | "horizontal" = "vertical"
): string {
  const dirLabel = writingDirection === "vertical" ? "縦書き（右→左）" : "横書き（左→右）";
  return OCR_RESTORATION_PROMPT.replace(/{{WRITING_DIRECTION}}/g, dirLabel);
}
