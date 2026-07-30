import type { ChocoParagraph } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";
import { instructionBoundary } from "./shared";

/**
 * 本文全体（伏せ段落は位置を明示）＋伏せた段落の役割・キーポイント・模範＋生徒回答
 * を渡し、段落単位の定性フィードバック(JSON)を求めるプロンプト。
 */
export function buildChocoReviewPrompt(
  paragraphs: ChocoParagraph[],
  blankIndex: number,
  studentText: string,
): string {
  const target = paragraphs[blankIndex];
  const roleLabel = CHOCO_ROLE_LABELS[target.role];
  const body = paragraphs
    .map((g, i) =>
      i === blankIndex
        ? `【${i + 1}段落＝ここが生徒の担当（役割: ${roleLabel}）】\n${studentText}`
        : `【${i + 1}段落（役割: ${CHOCO_ROLE_LABELS[g.role]}）】\n${g.text}`,
    )
    .join("\n\n");

  return `あなたは小論文の丁寧な添削者です。ある完成した小論文のうち「${blankIndex + 1}段落目（役割: ${roleLabel}）」だけを生徒が書きました。前後の段落は完成済みのお手本です。生徒の段落を、前後の文脈とのつながりを重視して評価してください。相手は「1段落だけなら書ける」という、まだ自信のない生徒です。まず良い点を認め、具体的に励ましてください。

${instructionBoundary("生徒が書いた段落")}

## 模範段落の扱い
- 模範段落は採点の基準として参照するだけです。フィードバックに模範段落の文言を
  そのまま引用したり、言い換えて全文を示したりしないでください（生徒には後で開示します）。
- 助言は生徒自身が書いた言葉を引用して行います。

## 小論文全体（${blankIndex + 1}段落目が生徒の回答）
${body}

## この段落で本来押さえたい背景知識・要点
${target.keyPoints.map((k, i) => `${i + 1}. ${k}`).join("\n")}

## 模範段落（この段落の理想例。生徒には後で開示する）
${target.text}

## 採点（各0〜10の整数）
- logic（論理）: 主張と理由がつながり、段落の役割(${roleLabel})を果たしているか
- coherence（つながり）: 前後の段落と自然につながり、話の流れを壊していないか
- expression（表現）: 日本語が正しく、読みやすいか

## 出力
指定された構造化出力スキーマに従い、すべて日本語で記述してください。各項目の内容は次のとおりです。
- scores.logic / coherence / expression: 上記3軸をそれぞれ 0〜10 の整数で採点する
- feedback.overall: 全体講評。2〜3文で、まず良い点を認める
- feedback.goodPoints: 良かった点を1〜2個
- feedback.improvements: もう一歩の点を1〜2個
- feedback.languageCorrections: 日本語の直し。original は生徒の段落に**完全一致する原文**だけを使い、
  引用できない指摘は返さない。重要度の高い最大3件に絞る
- feedback.weaknessTags: 弱点タグ（例: 論理の飛躍、主張が曖昧、接続の不足）
- feedback.nextTip: 次に気をつけることを1つ`;
}
