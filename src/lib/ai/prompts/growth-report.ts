import type { GrowthReport } from "@/lib/types/growth-report";

/**
 * 総合所見生成 (buildComprehensiveAssessmentPrompt) の入力。
 * 小論文/面接の統計は呼び出し側で1〜数行の要約文字列に整形して渡す
 * (プロンプト側で改めて集計しない設計)。
 */
export interface ComprehensiveAssessmentInput {
  studentName: string;
  period: "weekly" | "monthly";
  /** 小論文の件数・平均・増減・弱点カテゴリ等の要約文字列 */
  essaySummary: string;
  /** 面接の件数・平均・増減・弱点カテゴリ等の要約文字列 */
  interviewSummary: string;
  /** 弱点推移の要約文字列 */
  weaknessSummary: string;
  /** 面談セッションの反映（要約・アクションアイテム・次回アジェンダ） */
  sessionDigest?: GrowthReport["sessionDigest"];
  /** 活動実績の集計 */
  activitySummary?: GrowthReport["activitySummary"];
  /** 出願書類の進捗・締切状況 */
  documentSummary?: GrowthReport["documentSummary"];
  /** 自己分析の要点・志望校・MBTI・資格等をまとめた文字列 (任意) */
  selfAnalysisNote?: string;
  /** 講師の観察（debrief由来のAI要約。生徒安全な短文リスト、任意） */
  sessionObservations?: string[];
}

/**
 * 小論文・面接だけでなく、面談の次アジェンダ・アクションアイテム、活動実績、
 * 出願書類の締切・進捗、自己分析/志望校適合を横断参照して、
 * この期間の全体像・成長・つまずき・次の一手をAIに評価させるプロンプトを組み立てる。
 * 未取得のセクションは「該当なし/未取得」として扱わせ、無理な言及を避けさせる。
 */
export function buildComprehensiveAssessmentPrompt(
  input: ComprehensiveAssessmentInput
): string {
  const periodLabel = input.period === "weekly" ? "週次" : "月次";

  const sessionDigestText = input.sessionDigest
    ? `面談実施回数: ${input.sessionDigest.totalCount}件\n${input.sessionDigest.sessions
        .map((s) => {
          const parts = [`- ${s.date}`];
          if (s.goal) parts.push(`目標: ${s.goal}`);
          if (s.summaryPoints.length > 0)
            parts.push(`要約: ${s.summaryPoints.join(" / ")}`);
          if (s.actionItems.length > 0)
            parts.push(`アクションアイテム: ${s.actionItems.join(" / ")}`);
          if (s.nextAgenda) parts.push(`次回アジェンダ: ${s.nextAgenda}`);
          return parts.join(" | ");
        })
        .join("\n")}`
    : "該当なし/未取得";

  const activitySummaryText = input.activitySummary
    ? `活動実績件数: ${input.activitySummary.totalCount}件\nハイライト: ${
        input.activitySummary.highlights.length > 0
          ? input.activitySummary.highlights.join(" / ")
          : "なし"
      }`
    : "該当なし/未取得";

  const documentSummaryText = input.documentSummary
    ? `出願書類: 全${input.documentSummary.total}件中 完成${input.documentSummary.completed}件・作成中${input.documentSummary.inProgress}件\n直近の締切: ${
        input.documentSummary.upcomingDeadlines.length > 0
          ? input.documentSummary.upcomingDeadlines
              .map((d) => `${d.title}(${d.deadline})`)
              .join(" / ")
          : "なし"
      }`
    : "該当なし/未取得";

  const sessionObservationsText =
    input.sessionObservations && input.sessionObservations.length > 0
      ? input.sessionObservations.map((o) => `- ${o}`).join("\n")
      : "該当なし/未取得";

  const selfAnalysisText = input.selfAnalysisNote ?? "該当なし/未取得";

  return `あなたは総合型選抜（旧AO入試）専門の添削者・進路コーチです。評価軸は常に「自分の言葉で語れているか」「実体験に裏打ちされているか」「志望校のアドミッションポリシー(AP)に合致しているか」です。

以下は生徒「${input.studentName}」の${periodLabel}レポート期間中に蓄積された、小論文・面接・面談・活動実績・出願書類・自己分析のデータです。**小論文と面接の統計だけで判断せず、面談の次回アジェンダやアクションアイテム、活動実績、出願書類の締切・進捗、自己分析や志望校適合の状況も必ず横断的に参照した上で**、この期間の全体像・成長・つまずき・次の一手を評価してください。

## 小論文の状況
${input.essaySummary}

## 面接の状況
${input.interviewSummary}

## 弱点推移
${input.weaknessSummary}

## 面談セッション（要約・アクションアイテム・次回アジェンダ）
${sessionDigestText}

## 講師の観察（授業中の気づき）
${sessionObservationsText}

## 活動実績
${activitySummaryText}

## 出願書類の進捗・締切
${documentSummaryText}

## 自己分析・志望校適合
${selfAnalysisText}

## 出力形式
以下の厳密なJSON形式のみを出力してください（前後に説明文やコードフェンス以外の文字を含めない）。
\`\`\`json
{
  "overallAssessment": "この期間の全体像・成長・つまずき・次の一手を300〜500字程度の日本語散文でまとめる",
  "recommendations": [
    "全データを横断した具体的な推奨アクション1（日本語）",
    "全データを横断した具体的な推奨アクション2（日本語）",
    "全データを横断した具体的な推奨アクション3（日本語）"
  ]
}
\`\`\`

注意:
- 「該当なし/未取得」のセクションについては無理に言及せず、取得できているデータのみを根拠にする
- 小論文/面接のスコアだけでなく、面談のアクションアイテムが実行されているか、講師が授業中に観察した気づき、活動実績が志望理由に活かされているか、出願書類の締切が近いのに進捗が遅れていないか、自己分析と志望校APが合致しているかを踏まえて評価する
- recommendationsは3〜5件、それぞれ具体的で実行可能な内容にする
- 出力は指定したJSON以外の文字を含めない`;
}

export function buildGrowthReportPrompt(
  weaknessList: string,
  scoreTrend: string,
  avgComparison: string
): string {
  return `あなたは総合型選抜の学習コーチです。生徒の成長状況を分析し、励ましと具体的な改善提案を含むレポートを作成してください。

## 生徒の弱点一覧
${weaknessList}

## スコア推移
${scoreTrend}

## 全体平均との比較
${avgComparison}

## 出力形式
以下のJSON形式で出力してください。
\`\`\`json
{
  "summary": "生徒の成長を総合的に評価する文章（200-300字程度）。良い点を認めつつ、改善の方向性を示す。",
  "recommendations": [
    "具体的な改善提案1",
    "具体的な改善提案2",
    "具体的な改善提案3"
  ]
}
\`\`\`

注意:
- ポジティブなトーンで書く
- 具体的なアクションを提案する
- 生徒のモチベーションを高める表現を使う`;
}
