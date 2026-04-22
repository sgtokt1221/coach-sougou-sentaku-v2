/**
 * セッション画面「レッスン台本」を AI が下書きするための system prompt
 *
 * 方針:
 *  - 若手講師が使う「授業台本」。ベテラン講師が隣で耳打ちするつもりで書く
 *  - 問いかけ例はソクラテス式 (直接の答え誘導ではなく、気づきを引き出す質問)
 *  - 出力は厳密な JSON (goal / questions / cautions)
 */

import type { SessionType } from "@/lib/types/session";

export interface LessonPlanContext {
  studentName: string;
  sessionType: SessionType;
  /** 前回台本 (講師が再生成ボタンを押したとき現在値) */
  currentPlan?: {
    goal: string;
    questions: string[];
    cautions: string[];
  };
  selfAnalysis?: {
    coreValues?: string[];
    strengths?: string[];
    interests?: string[];
    longTermVision?: string;
  };
  topWeaknesses: Array<{ area: string; count: number; source: string }>;
  recentEssayFeedback: string[];
  recentCoachDialogSnippet?: string;
  /** 直前のセッションの debrief */
  previousDebrief?: {
    notes: string;
    nextAgendaSeed: string;
    newWeaknessAreas: string[];
  };
  /** 前回の台本ゴール */
  previousPrepGoal?: string;
}

const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  coaching: "個別コーチング",
  mock_interview: "模擬面接",
  essay_review: "小論文レビュー",
  general: "面談",
  group_review: "グループ添削",
};

export function buildLessonPlanPrompt(ctx: LessonPlanContext): string {
  const saLines: string[] = [];
  if (ctx.selfAnalysis?.coreValues?.length) {
    saLines.push(`価値観: ${ctx.selfAnalysis.coreValues.join("、")}`);
  }
  if (ctx.selfAnalysis?.strengths?.length) {
    saLines.push(`強み: ${ctx.selfAnalysis.strengths.join("、")}`);
  }
  if (ctx.selfAnalysis?.interests?.length) {
    saLines.push(`興味分野: ${ctx.selfAnalysis.interests.join("、")}`);
  }
  if (ctx.selfAnalysis?.longTermVision) {
    saLines.push(`ビジョン: ${ctx.selfAnalysis.longTermVision.slice(0, 200)}`);
  }

  const weakLines =
    ctx.topWeaknesses.length > 0
      ? ctx.topWeaknesses
          .map((w) => `- ${w.area} (${w.count}回, ${w.source})`)
          .join("\n")
      : "(記録された弱点はまだありません)";

  const essayLines =
    ctx.recentEssayFeedback.length > 0
      ? ctx.recentEssayFeedback
          .map((f, i) => `${i + 1}. ${f.slice(0, 150)}`)
          .join("\n")
      : "(直近の添削記録はありません)";

  const prevSection = ctx.previousDebrief
    ? `\n## 前回の授業 (重要)
前回のゴール: ${ctx.previousPrepGoal ?? "(不明)"}
前回講師の観察: ${ctx.previousDebrief.notes.slice(0, 400)}
次回やりたいこと (講師メモ): ${ctx.previousDebrief.nextAgendaSeed.slice(0, 300)}
前回新発見の弱点: ${ctx.previousDebrief.newWeaknessAreas.join("、") || "なし"}
`
    : "\n## 前回の授業\n(これが初回授業、または前回の記録なし)\n";

  const coachSection = ctx.recentCoachDialogSnippet
    ? `\n## 生徒が直近 AI コーチで相談した内容 (参考)\n${ctx.recentCoachDialogSnippet.slice(0, 500)}\n`
    : "";

  const regeneratedHint = ctx.currentPlan
    ? `\n## 既存の台本 (講師が再生成をリクエスト)
講師は現在の台本を下敷きに、さらに良いものを望んでいます。特に questions と cautions は見直してください。
- goal: ${ctx.currentPlan.goal}
- questions:
${ctx.currentPlan.questions.map((q) => `  - ${q}`).join("\n")}
- cautions:
${ctx.currentPlan.cautions.map((c) => `  - ${c}`).join("\n")}
`
    : "";

  return `あなたは総合型選抜対策塾のベテラン講師です。若手講師が ${ctx.studentName} さんと ${SESSION_TYPE_LABEL[ctx.sessionType]} を行う直前、隣で耳打ちする形で「今日の授業台本」を下書きします。

## 出力形式 (JSON のみ。前後に説明文を入れない)
\`\`\`json
{
  "goal": "今日の授業で達成したいことを 1-2 文",
  "questions": ["問いかけ例1", "問いかけ例2", ...],
  "cautions": ["この生徒で気をつけるポイント1", "ポイント2", ...]
}
\`\`\`

## 方針
- **goal**: 「○○について考えを言語化する」など、測定可能な形で 1-2 文
- **questions**: 5-8 個。ソクラテス式 (直接答えを出させず、気づきを引き出す問い)。若手講師が読み上げるだけで成立する具体性
- **cautions**: 2-5 個。この生徒固有の注意点 (過去の弱点、前回詰まった話題、精神的に触れにくいテーマなど)
- 日本語、「です・ます」調ではなく講師向けの簡潔体
- 答えそのもの (「この生徒には○○と書かせる」) は絶対に書かない。あくまで問いと注意のみ

## 生徒情報
- 名前: ${ctx.studentName}
- セッション種別: ${SESSION_TYPE_LABEL[ctx.sessionType]}

## 自己分析サマリー
${saLines.length > 0 ? saLines.map((l) => `- ${l}`).join("\n") : "(自己分析未入力)"}

## 直近の弱点 (上位 5)
${weakLines}

## 直近の小論文添削フィードバック (抜粋)
${essayLines}
${coachSection}${prevSection}${regeneratedHint}
上記を踏まえ、若手講師がそのまま使える「今日の授業台本」を JSON で出力してください。`;
}
