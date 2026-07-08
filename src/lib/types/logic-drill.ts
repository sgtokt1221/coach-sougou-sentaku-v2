// src/lib/types/logic-drill.ts

/** v2で全8型（記述5型＋4択1型を追加）。 */
export type LogicDrillType =
  | "flaw_finder"
  | "quick_logic"
  | "skeleton"
  | "abstraction"
  | "rebuttal"
  | "compare"
  | "question_framing"
  | "alexandra";

export const LOGIC_DRILL_TYPES: LogicDrillType[] = [
  "flaw_finder",
  "quick_logic",
  "skeleton",
  "abstraction",
  "rebuttal",
  "compare",
  "question_framing",
  "alexandra",
];

export const LOGIC_DRILL_TYPE_LABELS: Record<LogicDrillType, string> = {
  flaw_finder: "論理の穴さがし",
  quick_logic: "即興ロジック",
  skeleton: "骨組み穴埋め",
  abstraction: "具体↔抽象変換",
  rebuttal: "反論想定と応答",
  compare: "比較・対比して選ぶ",
  question_framing: "問いの明確化",
  alexandra: "アレクサンドラ構文",
};

/** 論理的欠陥の種類（flaw_finder の選択肢/正解ラベル） */
export type FlawKind =
  | "leap" // 飛躍
  | "substitution" // すり替え
  | "circular" // 循環論法
  | "overgeneralize" // 過度な一般化
  | "false_cause"; // 因果の取り違え

export const FLAW_KIND_LABELS: Record<FlawKind, string> = {
  leap: "論理の飛躍",
  substitution: "論点のすり替え",
  circular: "循環論法",
  overgeneralize: "過度な一般化",
  false_cause: "因果の取り違え",
};

/** 問題バンクの1問（型により data の形が変わる判別ユニオン） */
export type LogicDrillItem =
  | {
      id: string;
      type: "flaw_finder";
      prompt: string; // 欠陥を含む意見文（3〜5文）
      answerFlaw: FlawKind; // 正解の欠陥種別
      explanation: string; // 模範解説
    }
  | {
      id: string;
      type: "quick_logic";
      prompt: string; // 賛否が割れるお題
      timeLimitSec?: number; // 未指定は DEFAULT_QUICK_LOGIC_SEC
    }
  | {
      id: string;
      type: "skeleton";
      prompt: string; // 論じるテーマ
    }
  | {
      id: string;
      type: "abstraction";
      prompt: string; // 変換対象の記述
      direction: "concretize" | "abstract"; // 抽象→具体 / 具体→抽象
    }
  | {
      id: string;
      type: "rebuttal";
      prompt: string; // 自分の主張／テーマ
    }
  | {
      id: string;
      type: "compare";
      prompt: string; // 問い
      optionA: string; // 選択肢A
      optionB: string; // 選択肢B
    }
  | {
      id: string;
      type: "question_framing";
      prompt: string; // 曖昧なテーマ
    }
  | {
      id: string;
      type: "alexandra";
      prompt: string; // 係り受けが紛らわしい文＋空欄設問
      choices: string[]; // 4択
      answerIndex: number; // 正解の選択肢インデックス（0-3）
      explanation: string; // 解説
    };

export const DEFAULT_QUICK_LOGIC_SEC = 300; // 5分

/** 生徒の回答（型別。評価APIに送る） */
export type LogicDrillAnswer =
  | {
      type: "flaw_finder";
      selectedFlaw: FlawKind;
      explanation: string;
      fix: string;
    }
  | {
      type: "quick_logic";
      stance: "agree" | "disagree";
      reasons: string[];
    }
  | {
      type: "skeleton";
      claim: string; // 主張
      grounds: string; // 根拠
      example: string; // 具体例
      rebuttal: string; // 反論応答
    }
  | {
      type: "abstraction";
      text: string;
    }
  | {
      type: "rebuttal";
      counterArgument: string; // 最強の反論
      response: string; // それへの再反論
    }
  | {
      type: "compare";
      contrast: string; // 対比
      choice: "A" | "B"; // 選択
      reason: string; // 理由
    }
  | {
      type: "question_framing";
      question: string; // 立てた問い
      why: string; // なぜその問いか
    }
  | {
      type: "alexandra";
      selectedIndex: number;
    };

export interface LogicDrillScores {
  consistency: number; // 論理の一貫性 0-5
  validity: number; // 根拠の妥当性 0-5
  structure: number; // 構成の明快さ 0-5
}

export interface LogicDrillFeedback {
  good: string; // 良かった点
  improve: string; // 改善点（赤ペン）
  flawCorrect?: boolean; // flaw_finder 専用: 欠陥同定が正解か
  mcqCorrect?: boolean; // alexandra 専用: 4択が正解か
  modelAnswer?: string; // 模範例（任意）
}

export interface LogicDrillResult {
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
}

/** Firestore: users/{uid}/logicDrills/{autoId} に保存する形 */
export interface LogicDrillRecord {
  id: string;
  drillType: LogicDrillType;
  itemId: string;
  answer: LogicDrillAnswer;
  scores: LogicDrillScores;
  feedback: LogicDrillFeedback;
  completedAt: unknown; // FieldValue.serverTimestamp() / 読み出し時は Timestamp
}
