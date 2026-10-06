import type { InterviewScores } from "@/lib/types/interview";

/**
 * 面接の軸の正本。どの軸を出し、どれが合計に入るかを回ごとに決める。
 *
 * 採点の版で軸が変わっている:
 *   - v5（2026-10-07〜）: 共通は 明確さ・AP合致度・一貫性・具体性。
 *     口頭試問は 明確さ・具体性・専門知識・応用思考力（AP・熱意は参考値）
 *   - v4（2026-10-05〜06）: 共通は 明確さ・AP合致度・熱意・具体性。口頭試問は v5 と同じ
 *   - 〜v3: 共通4軸。口頭試問は共通4軸＋専門知識で満点50
 * 以前は生徒の結果画面だけがこれを持ち、管理者の詳細は4軸固定で合計と合わなかった。
 */
export type InterviewAxisKey = Exclude<keyof InterviewScores, "total" | "totalMax">;

export interface InterviewAxis {
  key: InterviewAxisKey;
  label: string;
  /** 合計に入る軸か。入らない軸は「（合計外）」を付けて見せる */
  inTotal: boolean;
}

export const INTERVIEW_AXIS_LABELS: Record<InterviewAxisKey, string> = {
  clarity: "明確さ",
  apAlignment: "AP合致度",
  consistency: "一貫性",
  enthusiasm: "熱意",
  specificity: "具体性",
  bodyLanguage: "ボディランゲージ",
  presentationStructure: "発表の論理構成",
  dataEvidence: "データの根拠",
  resourceConsistency: "資料との整合性",
  knowledgeAccuracy: "専門知識の正確性",
  criticalThinking: "応用思考力",
  collaboration: "協調性",
  leadership: "リーダーシップ",
  listening: "傾聴力",
};

const MODE_EXTRA: Record<string, InterviewAxisKey[]> = {
  presentation: ["presentationStructure", "dataEvidence", "resourceConsistency"],
  oral_exam: ["knowledgeAccuracy", "criticalThinking"],
  group_discussion: ["collaboration", "leadership", "listening"],
};

export function interviewAxisLayout(
  mode: string | undefined,
  scores: Partial<InterviewScores> | null | undefined
): InterviewAxis[] {
  const s = scores ?? {};
  const has = (k: InterviewAxisKey) => typeof s[k] === "number";
  const isOral = mode === "oral_exam";
  const legacyOral = isOral && s.totalMax === 50;
  // v4 の口頭試問は共通4軸の点が付いていても合計外。v5 は一貫性の代わりに熱意が無い
  const oralV4orLater = isOral && !legacyOral && has("knowledgeAccuracy") && has("criticalThinking");

  const inTotal = new Set<InterviewAxisKey>();
  if (oralV4orLater) {
    ["clarity", "specificity", "knowledgeAccuracy", "criticalThinking"].forEach((k) =>
      inTotal.add(k as InterviewAxisKey)
    );
  } else if (legacyOral) {
    ["clarity", "apAlignment", "enthusiasm", "specificity", "knowledgeAccuracy"].forEach((k) =>
      inTotal.add(k as InterviewAxisKey)
    );
  } else {
    inTotal.add("clarity");
    inTotal.add("apAlignment");
    inTotal.add(has("consistency") ? "consistency" : "enthusiasm");
    inTotal.add("specificity");
  }

  // 共通軸は一貫性か熱意のどちらか付いている方を出す
  const common: InterviewAxisKey[] = [
    "clarity",
    "apAlignment",
    has("consistency") ? "consistency" : "enthusiasm",
    "specificity",
  ];
  const keys: InterviewAxisKey[] = [
    ...common,
    "bodyLanguage",
    ...(MODE_EXTRA[mode ?? ""] ?? []),
  ];
  return keys
    .filter((k) => s[k] != null)
    .map((k) => ({ key: k, label: INTERVIEW_AXIS_LABELS[k], inTotal: inTotal.has(k) }));
}

/** 画面に出すラベル。合計に入らない軸には「（合計外）」を付ける */
export function interviewAxisLabel(axis: InterviewAxis): string {
  return axis.inTotal ? axis.label : `${axis.label}（合計外）`;
}

/** 合計に入る軸の点だけを足す（検査と、合計の再計算に使う） */
export function sumInTotalAxes(
  mode: string | undefined,
  scores: Partial<InterviewScores>
): number {
  return interviewAxisLayout(mode, scores)
    .filter((a) => a.inTotal)
    .reduce((sum, a) => sum + Number(scores[a.key] ?? 0), 0);
}
