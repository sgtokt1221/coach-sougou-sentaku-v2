export function buildStoryCheckPrompt(
  universityName: string,
  facultyName: string,
  admissionPolicy: string,
  materials: {
    documents: { type: string; title: string; content: string }[];
    essays: { topic: string; content: string; score?: number }[];
    interviews: { mode: string; summary?: string }[];
    activities: { title: string; category: string; description: string; structuredData?: { motivation: string; actions: string[]; results: string[]; learnings: string[]; connection: string } }[];
    selfAnalysis?: { values: string[]; strengths: string[]; vision: string; selfStatement: string };
  }
): string {
  const documentsSection = materials.documents.length > 0
    ? materials.documents.map((d, i) => `### 書類${i + 1}: ${d.type} - ${d.title}\n${d.content}`).join("\n\n")
    : "（書類データなし）";

  const essaysSection = materials.essays.length > 0
    ? materials.essays.map((e, i) => `### 小論文${i + 1}: ${e.topic}\n${e.content}`).join("\n\n")
    : "（小論文データなし）";

  const interviewsSection = materials.interviews.length > 0
    ? materials.interviews.map((iv, i) => `### 面接${i + 1}: ${iv.mode}\n${iv.summary || "（サマリーなし）"}`).join("\n\n")
    : "（面接データなし）";

  const activitiesSection = materials.activities.length > 0
    ? materials.activities.map((a, i) => {
      let text = `### 活動${i + 1}: ${a.title}（${a.category}）\n${a.description}`;
      if (a.structuredData) {
        text += `\n動機: ${a.structuredData.motivation}`;
        text += `\n行動: ${a.structuredData.actions.join("、")}`;
        text += `\n成果: ${a.structuredData.results.join("、")}`;
        text += `\n学び: ${a.structuredData.learnings.join("、")}`;
        text += `\n大学との接続: ${a.structuredData.connection}`;
      }
      return text;
    }).join("\n\n")
    : "（活動データなし）";

  const selfAnalysisSection = materials.selfAnalysis
    ? `### 自己分析結果\n- 価値観: ${materials.selfAnalysis.values.join("、")}\n- 強み: ${materials.selfAnalysis.strengths.join("、")}\n- ビジョン: ${materials.selfAnalysis.vision}\n- 自己宣言: ${materials.selfAnalysis.selfStatement}`
    : "（自己分析未完了）";

  return `あなたは総合型選抜の出願戦略アドバイザーです。
生徒が作成した全ての出願素材を横断的に分析し、「合格ストーリー」としての一貫性を7軸で評価してください。

## 志望大学・学部
- 大学: ${universityName}
- 学部: ${facultyName}
- アドミッションポリシー: ${admissionPolicy || "（未設定）"}

## 生徒の出願素材

#### 出願書類
${documentsSection}

#### 小論文
${essaysSection}

#### 面接記録
${interviewsSection}

#### 活動実績
${activitiesSection}

#### 自己分析
${selfAnalysisSection}

## 7軸分析
以下の7軸で分析してください:
1. **志望動機の一貫性** — 各素材での志望理由に矛盾がないか
2. **将来ビジョンの整合性** — 将来目標が統一されているか
3. **活動実績と主張の接続** — 強みが活動で裏付けられているか
4. **AP適合の一貫性** — APキーワードが各素材に反映されているか
5. **エピソード活用バランス** — 重複・欠落がないか
6. **トーン・人物像の統一** — 人物像にブレがないか
7. **時系列の整合性** — 活動時期と言及の矛盾がないか

## 出力形式（必ずJSON形式で出力してください）

\`\`\`json
{
  "overallScore": <0-100の整数>,
  "overallAssessment": "<全体評価コメント>",
  "axisScores": [
    {
      "axis": "<軸名>",
      "score": <0-100の整数>,
      "assessment": "<評価コメント>",
      "evidence": ["<根拠1>", "<根拠2>"]
    }
  ],
  "contradictions": [
    {
      "severity": "critical" | "warning" | "info",
      "source1": { "type": "<素材タイプ>", "id": "", "title": "<素材名>" },
      "source2": { "type": "<素材タイプ>", "id": "", "title": "<素材名>" },
      "description": "<矛盾の内容>"
    }
  ],
  "weakConnections": [
    { "area": "<弱い接続のエリア>", "suggestion": "<改善提案>" }
  ],
  "storyStrengths": ["<ストーリーの強み1>", "<強み2>"],
  "actionItems": [
    {
      "priority": "high" | "medium" | "low",
      "action": "<改善アクション>",
      "targetMaterial": "<対象素材>"
    }
  ]
}
\`\`\`

JSON以外のテキストは出力しないでください。`;
}
