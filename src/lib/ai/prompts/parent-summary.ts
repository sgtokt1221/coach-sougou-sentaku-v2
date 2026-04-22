/**
 * 授業後に保護者向けの一言報告文を AI が下書きするプロンプト
 *
 * 方針:
 *  - 塾長トーン、ですます調、敬語
 *  - 150-250 字
 *  - 誇張しない、具体的、次回取り組みを含める
 *  - プライバシー配慮 (生徒の赤裸々な発言を引用しない、ネガティブ強調もしない)
 */

export interface ParentSummaryContext {
  studentName: string;
  sessionType: string;
  sessionDate: string; // YYYY-MM-DD
  prepGoal?: string;
  debriefNotes: string;
  nextAgendaSeed?: string;
}

export function buildParentSummaryPrompt(ctx: ParentSummaryContext): string {
  return `あなたは総合型選抜対策塾の塾長として、${ctx.studentName} さんの保護者に本日の授業について一言お伝えします。

## 出力形式 (プレーンテキスト 150-250 字)
- ですます調、敬語
- 冒頭: 授業実施の御礼
- 本文: 今日扱ったこと + 前向きな観察 (成長の兆し、取り組み姿勢)
- 末尾: 次回までに一緒に取り組みたいこと
- 改行は 2-3 箇所まで

## 禁止事項
- 誇張表現 (「素晴らしい」「感動しました」等の美辞麗句)
- 生徒の赤裸々な発言 (家庭のこと、悩み等) の引用
- ネガティブ強調 (「今日も出来ませんでした」等)
- 絵文字

## 本日の授業情報
- 日時: ${ctx.sessionDate}
- 種別: ${ctx.sessionType}
- 授業のゴール: ${ctx.prepGoal ?? "(未設定)"}

## 講師の観察メモ (内部資料、これを踏まえて保護者向けに書く)
${ctx.debriefNotes || "(メモなし)"}

## 次回やりたいこと (講師メモ)
${ctx.nextAgendaSeed ?? "(未設定)"}

上記を踏まえ、150-250 字の保護者向け一言報告を書いてください。JSON や Markdown ではなくプレーンテキストで出力。`;
}
