// src/lib/ai/prompts/logic-drill.ts
import {
  FLAW_KIND_LABELS,
  type LogicDrillItem,
  type LogicDrillAnswer,
} from "@/lib/types/logic-drill";

const COMMON_RUBRIC = `あなたは高校生の小論文・論理表現を指導するコーチです。
以下の回答を「論理」の観点で採点してください。必ず日本語で、次のJSONだけを出力してください（前後に文章を付けない）。
{
  "scores": { "consistency": <0-5>, "validity": <0-5>, "structure": <0-5> },
  "feedback": { "good": "<良かった点>", "improve": "<改善点(具体的な赤ペン)>"{FLAW_FIELD} }
}
- consistency: 主張と根拠が矛盾なく一貫しているか
- validity: 根拠が主張を支える妥当なものか（飛躍・すり替えがないか）
- structure: 構成が明快で読み手に伝わるか`;

export function buildLogicDrillPrompt(
  item: LogicDrillItem,
  answer: LogicDrillAnswer,
): string {
  if (item.type === "flaw_finder" && answer.type === "flaw_finder") {
    const correct = FLAW_KIND_LABELS[item.answerFlaw];
    const picked = FLAW_KIND_LABELS[answer.selectedFlaw];
    const rubric = COMMON_RUBRIC.replace(
      "{FLAW_FIELD}",
      `, "flawCorrect": <true|false>, "modelAnswer": "<模範的な修正の要点>"`,
    );
    return `${rubric}

【問題文（欠陥を含む意見文）】
${item.prompt}

【正解の欠陥種別】${correct}
【生徒が選んだ欠陥種別】${picked}
【生徒の説明】${answer.explanation}
【生徒の修正文】${answer.fix}

flawCorrect は「生徒が選んだ欠陥種別が正解と一致するか」で判定してください。
修正文が論理的に通っているかを validity/consistency に反映してください。`;
  }

  if (item.type === "quick_logic" && answer.type === "quick_logic") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範例の要点>"`);
    const stance = answer.stance === "agree" ? "賛成" : "反対";
    const reasons = answer.reasons.map((r, i) => `理由${i + 1}: ${r}`).join("\n");
    return `${rubric}

【お題】${item.prompt}
【立場】${stance}
${reasons}

立場と理由の一貫性(consistency)、理由の妥当性・非重複(validity)、全体構成(structure)を採点してください。`;
  }

  // 型と回答が不一致（呼び出し側でガード済みだが保険）
  throw new Error("logic-drill: item.type と answer.type が一致しません");
}
