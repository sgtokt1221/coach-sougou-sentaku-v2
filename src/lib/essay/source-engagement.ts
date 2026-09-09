/**
 * 課題文型（questionType === "report"）で、答案が課題文に触れたかを採点に効かせる。
 *
 * 監査で分かったこと（2026-09-09）:
 * 採点の5軸に資料読解の観点が1つも無く、サーバ側で効く上限も
 * 「資料と矛盾した（contradicted）」の1本だけだった。つまり
 * **課題文を無視した答案には減点が存在せず**、矛盾しようがないぶん
 * 読まないほうが安全ですらあった。誤読を書き留める reportInsights.misreadings も
 * 表示専用で、採点コードは読んでいなかった。
 *
 * ここでは新しい採点軸を足さない。軸名がコード全体に手書きで散っており
 * （choco/score.ts は5軸を個別に足しているため6軸目を黙って無視する）、
 * skill-check/aggregate.ts が同じ0-50尺度で合成しているので、軸を増やすと
 * 合成値が黙って壊れる。合計50点・ランク境界は据え置き、既存の上限機構
 * （subjectMatch → cap、review-core.ts）に1本足すだけにする。
 *
 * ここは上限の決め方だけを持つ純関数。判定そのものは別呼び出しで行う
 * （src/lib/essay/source-engagement-judge.ts）。Firestore にも AI にも
 * 依存しないので scripts/verify-source-engagement.ts から直接検証する。
 */

/** 答案が課題文にどれだけ踏み込んでいるか */
export type SourceEngagementLevel = "grounded" | "shallow" | "absent";

export interface SourceCaps {
  /** 内容4軸（構成・論理性・独自性・成熟度）の上限 */
  content: number;
  /** 論理性だけに追加でかかる上限 */
  logic: number;
  /** 上限をかけた理由。null なら何もかけていない */
  reason: string | null;
}

/** 上限なし */
const NO_CAP: SourceCaps = { content: 10, logic: 10, reason: null };

/**
 * 課題文の扱いから上限を決める。
 *
 * report 以外では**一切適用しない**。資料の無い設問に読解の減点をかけると、
 * テーマ型の答案が理由なく下がる（既存プロンプトの default 分岐と同じ扱い）。
 *
 * absent は主題ずれ（subjectMatch === "different"）と同じ3点にする。
 * 課題文を読まずに書いた答案は「別の問いへの答え」と同じだけ外している、
 * という判断。半端な重さにすると中位帯に居座る（v11 で実測済み）。
 */
export function sourceEngagementCaps(params: {
  questionType?: string | null;
  /** 課題文の扱いの判定。取れなければ減点しない */
  level?: SourceEngagementLevel | null;
  /** reportInsights.misreadings。非空なら課題文の取り違えがある */
  misreadings?: string[] | null;
}): SourceCaps {
  if (params.questionType !== "report") return NO_CAP;

  const level = params.level;
  const hasMisreading = (params.misreadings?.length ?? 0) > 0;

  // 誤読は logic だけを抑える（読んではいるので、構成や表現まで巻き込まない）
  const logicFromMisreading = hasMisreading ? 4 : 10;

  if (level === "absent") {
    return {
      content: 3,
      logic: Math.min(3, logicFromMisreading),
      reason: "課題文に触れていない",
    };
  }
  if (level === "shallow") {
    return {
      content: 6,
      logic: Math.min(6, logicFromMisreading),
      reason: "課題文への言及が一般論の域を出ない",
    };
  }
  if (hasMisreading) {
    return { content: 10, logic: 4, reason: "課題文の取り違えがある" };
  }
  // grounded、または判定が取れなかった場合は何もしない。
  // 判定漏れで減点すると、AI が欄を埋め忘れただけの答案が落ちる
  return NO_CAP;
}

/** 生徒に見せる短いラベル。合計には入れない指標として表示する */
export function sourceEngagementLabel(level: SourceEngagementLevel): string {
  switch (level) {
    case "grounded":
      return "課題文を踏まえている";
    case "shallow":
      return "課題文への言及が浅い";
    case "absent":
      return "課題文に触れていない";
  }
}
