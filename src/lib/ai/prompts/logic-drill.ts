// src/lib/ai/prompts/logic-drill.ts
import {
  FLAW_KIND_LABELS,
  type LogicDrillItem,
  type LogicDrillAnswer,
} from "@/lib/types/logic-drill";
import { instructionBoundary } from "./shared";

const COMMON_RUBRIC = `あなたは高校生の小論文・論理表現を指導するコーチです。
以下の回答を「論理」の観点で採点してください。必ず日本語で、次のJSONだけを出力してください（前後に文章を付けない）。

${instructionBoundary("生徒の説明・修正文・意見文")}

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

  if (item.type === "skeleton" && answer.type === "skeleton") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範的な骨組みの要点>"`);
    return `${rubric}

【テーマ】${item.prompt}
【主張】${answer.claim}
【根拠】${answer.grounds}
【具体例】${answer.example}
【反論への応答】${answer.rebuttal}

主張・根拠・具体例・反論応答の4枠で論の骨組みを評価してください。
consistency=主張と根拠・具体例が首尾一貫しているか、validity=根拠が主張を妥当に支え具体例が根拠を裏づけ反論応答が的確か、structure=4枠が噛み合い論として成立しているかを採点してください。`;
  }

  if (item.type === "abstraction" && answer.type === "abstraction") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範的な変換例の要点>"`);
    const task =
      item.direction === "concretize"
        ? "抽象的な主張を、それを的確に説明する具体例に変換する課題"
        : "具体的な事例を、より一般的な主張へ抽象化する課題";
    return `${rubric}

【課題】${task}
【変換対象】${item.prompt}
【生徒の変換】${answer.text}

抽象と具体を適切に往復できているかを評価してください。
consistency=変換後が元の内容と論理的に対応しているか、validity=具体化なら例が主張を正しく代表するか／抽象化なら過度な一般化に陥っていないか、structure=変換文が明快に言語化されているかを採点してください。`;
  }

  if (item.type === "rebuttal" && answer.type === "rebuttal") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範的な反論・再反論の要点>"`);
    return `${rubric}

【自分の主張／テーマ】${item.prompt}
【想定した最強の反論】${answer.counterArgument}
【それへの応答（再反論）】${answer.response}

自説への反論を的確に想定し、それに応答できているかを評価してください。
consistency=反論と応答が噛み合っているか、validity=想定した反論が実際に強力で藁人形論法になっていないか・応答が反論を正面から乗り越えているか、structure=反論→応答の流れが明快かを採点してください。`;
  }

  if (item.type === "compare" && answer.type === "compare") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範的な対比と選択理由の要点>"`);
    const picked = answer.choice === "A" ? item.optionA : item.optionB;
    return `${rubric}

【問い】${item.prompt}
【選択肢A】${item.optionA}
【選択肢B】${item.optionB}
【生徒の対比】${answer.contrast}
【生徒の選択】${answer.choice}（${picked}）
【選択の理由】${answer.reason}

2つの選択肢を比較・対比し、理由をつけて選べているかを評価してください。
consistency=対比・選択・理由が一貫しているか、validity=対比の軸が的確で選択理由が妥当か、structure=対比→選択→理由の構成が明快かを採点してください。`;
  }

  if (item.type === "question_framing" && answer.type === "question_framing") {
    const rubric = COMMON_RUBRIC.replace("{FLAW_FIELD}", `, "modelAnswer": "<模範的な問いの立て方の要点>"`);
    return `${rubric}

【曖昧なテーマ】${item.prompt}
【立てた問い（論点）】${answer.question}
【なぜその問いか】${answer.why}

曖昧なテーマから、論じるに値する明確な問い（論点）を立てられているかを評価してください。
consistency=問いと理由が整合しているか、validity=問いが論じる価値があり具体的で答えられる射程になっているか、structure=問いと立てる理由が明快に言語化されているかを採点してください。`;
  }

  // 型と回答が不一致（呼び出し側でガード済みだが保険）。alexandra はAPI側で決定的採点するためここには来ない。
  throw new Error("logic-drill: item.type と answer.type が一致しません");
}
