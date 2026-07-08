// src/lib/types/logic-drill.ts

/** v1は2型。v2で "skeleton" | "abstraction" を追加予定。 */
export type LogicDrillType = "flaw_finder" | "quick_logic";

export const LOGIC_DRILL_TYPES: LogicDrillType[] = ["flaw_finder", "quick_logic"];

export const LOGIC_DRILL_TYPE_LABELS: Record<LogicDrillType, string> = {
  flaw_finder: "論理の穴さがし",
  quick_logic: "即興ロジック",
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
