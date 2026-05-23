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
 *
 * Phase 2 拡張: StudentContext (志望校・自己分析・MBTI・活動・資格) を題材に
 * 反映できるようにし、難易度・目安時間・目的・ルブリック・ヒント・講師メモを
 * 出力させる。
 */

import type { StudentContext } from "@/lib/growth/student-context";

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
  /** Phase 2: 生徒の個別文脈 (志望校・自己分析・MBTI・活動・資格) */
  studentContext: StudentContext;
}

/**
 * StudentContext から「生徒文脈」セクション群を組み立てる。
 * データが空のセクションは丸ごと省略する (プロンプト膨張防止)。
 */
function buildStudentContextSections(sc: StudentContext): string {
  const sections: string[] = [];

  if (sc.primaryTargets.length > 0) {
    const lines = sc.primaryTargets.map((t, i) => {
      const rank = i === 0 ? "第一志望" : i === 1 ? "第二志望" : "第三志望";
      return `- ${rank}: ${t.universityName} ${t.facultyName}\n  AP原文: ${t.admissionPolicy}`;
    });
    sections.push(`## この生徒の志望文脈\n${lines.join("\n")}`);
  }

  if (sc.selfAnalysis) {
    const sa = sc.selfAnalysis;
    const lines: string[] = [];
    if (sa.coreValues.length > 0) lines.push(`- コアバリュー: ${sa.coreValues.join("、")}`);
    if (sa.uniqueCombo) lines.push(`- 強みの組み合わせ: ${sa.uniqueCombo}`);
    if (sa.interests.length > 0) lines.push(`- 関心領域: ${sa.interests.join("、")}`);
    if (sa.shortTermGoal) lines.push(`- 短期目標: ${sa.shortTermGoal}`);
    if (sa.apConnection) lines.push(`- AP接続の言語化: ${sa.apConnection}`);
    if (lines.length > 0) {
      sections.push(`## 自己分析\n${lines.join("\n")}`);
    }
  }

  if (sc.mbtiType) {
    sections.push(
      `## MBTI\n${sc.mbtiType} (4文字タイプ。得意領域を補強する程度に題材選びに使ってよい)`,
    );
  }

  if (sc.recentActivities.length > 0) {
    const lines = sc.recentActivities.map((a) => {
      const conn = a.connection ? `\n  志望校との接続: ${a.connection}` : "";
      return `- 【${a.category}】${a.title}: ${a.summary}${conn}`;
    });
    sections.push(`## 直近の活動実績\n${lines.join("\n")}`);
  }

  if (sc.englishCerts.length > 0) {
    const lines = sc.englishCerts
      .map((c) => `- ${c.type}${c.score ? `: ${c.score}` : ""}`)
      .join("\n");
    sections.push(`## 取得済み資格\n${lines}`);
  }

  if (sections.length === 0) return "";
  return `\n${sections.join("\n\n")}\n`;
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

  const studentContextSections = buildStudentContextSections(ctx.studentContext);

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
${studentContextSections}
## 出題方針への反映ルール (生徒文脈がある場合)
- 志望校の AP に頻出する論点は積極的に題材に組み込む (第一志望を最優先)
- 活動実績がある場合、その経験を「導入の具体例」「説得材料」として題材化してよい
- 資格レベルで言語を調整: 英検準1以上なら英文資料を含む小論文を 1 問混ぜてよい、無資格なら日本語限定
- MBTI は断定的に押し付けず、得意領域の補強として参照
- 自己分析の apConnection があれば、その方向に寄せた問いを最低 1 つ含める

## あなたのタスク
**JSON のみ** を出力してください。説明文や前置きは禁止です。

- **primary** (授業中必須、**絶対に計 3 件出すこと**、usage="lesson"):
  - 小論文 1 件 + 面接 2 件
  - modelAnswer **必須** (省略禁止)
- **secondary** (宿題用、計 2 件、usage="homework"):
  - 小論文 1 件 + 面接 1 件
  - modelAnswer **必須** (省略禁止)

### 絶対要件 (違反厳禁)
- **primaryQuestions を 0 件にして返すことは絶対に禁止**。必ず 3 件出す
- **全類題に modelAnswer を必ず含める** (primary / secondary 問わず空禁止)
- 各類題に **relatedWeakness を必ず含める** (空禁止)
- 「今週の [テーマ名] で [項目] が X 点だったので、これを練習する」「今週の [質問] でつまった具体性を補強する」のように、**今週の事実とリンク**させて書く
- title は 30〜50 字程度の短文 (テーマ・質問の本体のみ)
- 過去テーマと完全に同じ題は禁止 (切り口を変えた再挑戦は推奨)

### 新フィールド (Phase 2 拡張、可能な限り埋める)
- **usage**: "lesson" (primary) / "homework" (secondary) のいずれかを必ず指定
- **difficulty**: "basic" / "standard" / "advanced" のいずれか。生徒の今週スコアと資格レベルから推定
- **estimatedMinutes**: 取り組み目安時間 (整数)。小論文 primary は 25-35、面接 primary は 10-15、小論文 secondary は 15-25、面接 secondary は 5-10 が目安
- **objective**: 「何を鍛えるか」を 1 文 (例: 「主張→理由→具体例の構成を 350 字で完成させる」)
- **rubric**: 評価観点を 3 項目 (例: ["主張が明確", "具体例が説得力ある", "結論が一貫"])
- **hints**: 生徒に与える足場かけを 2-3 項目 (例: ["まず立場を一文で宣言", "個人体験を 1 つ"])
- **teacherNotes**: 講師向けに「授業で問いかけるとよい質問」を 1 文 (省略可)

### modelAnswer の文字数基準 (JSON 切れを防ぐため簡潔に)
- **primary 小論文**: 350-450 字。主張 (80) / 理由 (120) / 具体例 (150) / 結論 (50) の構成
- **primary 面接**: 80-120 字。要点のみ、話し言葉で
- **secondary 小論文**: 200-280 字。主張 + 理由 + 具体例の骨子のみ
- **secondary 面接**: 60-100 字。要点のみ

合計文字数の目安: 約 2000 字以内に収め、JSON が出力途中で切れないようにする。

### データ不足時の方針
今週の弱点・テーマが乏しくても、慢性弱点や総合型選抜の頻出テーマから選んで **必ず計 5 件 (primary 3 + secondary 2) を生成**。空配列で返すことは絶対に禁止。

## 出力フォーマット
\`\`\`json
{
  "primaryQuestions": [
    {
      "id": "pq_p_1",
      "type": "essay",
      "usage": "lesson",
      "title": "あなたが社会で果たすべき役割について、500字以内で論じよ。",
      "relatedWeakness": "今週の論理性が 4.5/10 だったので、主張→理由→具体例の構成練習",
      "relatedPastTopic": "地域貢献について",
      "modelAnswer": "私は地域社会で...(400-500字の構成完成例)",
      "difficulty": "standard",
      "estimatedMinutes": 30,
      "objective": "主張→理由→具体例→結論の 4 部構成を 400 字で完成させる",
      "rubric": ["主張が冒頭で明確", "具体例が経験に基づく", "結論で一貫した立場"],
      "hints": ["まず立場を 1 文で宣言", "活動実績から具体例を 1 つ"],
      "teacherNotes": "経験談を AP の言葉に変換できているか確認"
    }
  ],
  "secondaryQuestions": [
    {
      "id": "pq_s_1",
      "type": "interview",
      "usage": "homework",
      "title": "高校時代で最も成長したと感じた瞬間は？",
      "relatedWeakness": "今週の具体性スコア低下を補うエピソード抽出練習",
      "modelAnswer": "(60-100 字の解答例)",
      "difficulty": "basic",
      "estimatedMinutes": 8,
      "objective": "出来事→気づき→現在への影響の 3 ステップで話す",
      "rubric": ["時系列が明確", "気づきが具体的"],
      "hints": ["数値で結果を示す", "30 秒で話せるよう刻む"]
    }
  ]
}
\`\`\`

JSON のみを出力してください。`;
}
