/**
 * 出願書類の採点軸の正本（document-review v10〜）。
 *
 * v10 で軸を「審査官が書類で確かめる問い」に組み直し、保存キーも変えた。
 *   旧: apAlignment / structure / originality / learningPlan / expression
 *   新: coherence / insight / fit / plan / readability
 * 旧軸は「AP合致度」がAPの網羅を、「独自性」が経験の珍しさを求める方向に
 * 引っぱり、APを本文に貼る書類や、なぜその学問かが書かれていない書類に
 * 高い点が付いていた。同じキーのまま意味を変えると、過去の書類の点が
 * 新しい軸として黙って表示されるので、キーごと変えて旧軸は読み取り専用にする。
 *
 * 軸の並び・ラベル・配点・合計の出し方は、ここを通す（画面ごとに軸名を
 * 手書きしない。面接の axis-layout.ts と同じ考え方）。
 */
import type { DocumentFeedback } from "@/lib/types/document";

export const DOCUMENT_REVIEW_AXES = [
  "coherence",
  "insight",
  "fit",
  "plan",
  "readability",
] as const;

export type DocumentReviewAxis = (typeof DOCUMENT_REVIEW_AXES)[number];

/** 合計40点の中での配点。文の正確さは赤ペンで直すので、点は小さくする */
export const DOCUMENT_REVIEW_WEIGHTS: Record<DocumentReviewAxis, number> = {
  coherence: 11,
  insight: 10,
  fit: 8,
  plan: 7,
  readability: 4,
};

export interface DocumentAxisSpec {
  /** 画面に出す名前 */
  label: string;
  /** 審査官がこの軸で確かめる問い */
  question: string;
  /** 4点以下にする印（これに当たる記述が中心なら、条件を満たしていない） */
  lowSigns: string;
}

type TypeSpec = Record<Exclude<DocumentReviewAxis, "readability">, DocumentAxisSpec | null>;

const READABILITY: DocumentAxisSpec = {
  label: "読みやすさ",
  question: "文が正確で、一度で読めるか",
  lowSigns: "主語と述語のねじれ、助詞の誤り、80字を超える文が続く",
};

/**
 * 書類の種類ごとの問い。fit は AP が無いときは採点しない（null）。
 * plan が null の種類では、学びの計画は採点しない（分母から外す）。
 */
const SPECS: Record<string, TypeSpec> = {
  志望理由書: {
    coherence: {
      label: "志望の筋",
      question:
        "経験から生まれた問いが、志望学部の学問につながっているか（なぜこの分野か）",
      lowSigns:
        "経験の分野と志望学部の分野がずれていて、なぜその学問で解くのかの橋渡しが無い。「社会の仕組みに関心を持った」のように一言で飛び越えている",
    },
    insight: {
      label: "経験と思考の質",
      question: "経験の中で本人が何に気づき、どう判断したか（この人は考える人か）",
      lowSigns:
        "「〜の大切さを学んだ」型の誰でも書ける教訓、「私の強みは粘り強さだ」のような自己申告の強み、出来事の経過だけで本人の判断が無い",
    },
    fit: {
      label: "大学との対応",
      question:
        "その大学・学部の何を、自分の計画の中で使うか（なぜこの大学か）",
      lowSigns:
        "アドミッション・ポリシーの引用や言い換え、「教育理念に共感した」などの賛辞、APの項目を並べて網羅しただけ",
    },
    plan: {
      label: "学びの計画",
      question: "入学後に何を、どう学び、何につなげるか",
      lowSigns:
        "分野名だけ、「幅広く学びたい」「積極的に参加したい」、学部が教えることの羅列",
    },
  },
  自己推薦書: {
    coherence: {
      label: "推薦の筋",
      question:
        "示した強みが、経験で裏づけられ、その学部での学びにつながっているか",
      lowSigns:
        "強みと経験と大学での学びが別々の話になっていて、互いを支えていない",
    },
    insight: {
      label: "強みの根拠の質",
      question: "強みを示す経験の中で、本人が何を考え、どう動いたか",
      lowSigns:
        "強みを表す言葉だけ、成果や役職の自慢だけ、「〜の大切さを学んだ」型の教訓",
    },
    fit: {
      label: "大学との対応",
      question: "その強みが、その学部の学びのどこで活きるか",
      lowSigns:
        "アドミッション・ポリシーの引用や言い換えだけ、賛辞だけ、APの項目の網羅だけ",
    },
    plan: {
      label: "入学後の目標",
      question: "入学後にその強みを使って何をするか",
      lowSigns: "「強みを生かして頑張りたい」のように中身が無い",
    },
  },
  研究計画書: {
    coherence: {
      label: "問いと方法の筋",
      question: "問いが明確で、方法がその問いに答えられる形になっているか",
      lowSigns:
        "問いがテーマ名だけで何を明らかにするかが無い、方法が問いに答えない",
    },
    insight: {
      label: "問いの深さ",
      question:
        "問いが本人の観察から出ていて、分かっていることと分かっていないことを区別できているか",
      lowSigns:
        "一般的な社会問題を挙げただけ、既に答えの出ている問い、先行の取り組みに触れていない",
    },
    fit: {
      label: "大学との対応",
      question: "その学部の学び・環境で、その研究ができる根拠があるか",
      lowSigns:
        "アドミッション・ポリシーの引用や言い換えだけ、賛辞だけ",
    },
    plan: {
      label: "実現可能性",
      question: "時期・資料・協力先など、実際に進められる計画か",
      lowSigns: "時期も手段も無い、高校生や学部生に実行できない規模",
    },
  },
  学業活動報告書: {
    coherence: {
      label: "活動の筋",
      question:
        "活動の事実（時期・役割・規模）→ 本人の行動 → 学び がつながっているか",
      lowSigns: "何をしたかの事実が曖昧、行動と学びがつながっていない",
    },
    insight: {
      label: "行動と学びの質",
      question: "活動の中で本人が何を判断し、何を学んだか",
      lowSigns:
        "「〜の大切さを学んだ」型の教訓、成果の羅列だけ、本人の判断が無い経過報告",
    },
    fit: {
      label: "大学との対応",
      question:
        "活動で得た力や関心が、アドミッション・ポリシーのどこに当たるか読み取れるか（志望理由を書くことは求めない）",
      lowSigns: "アドミッション・ポリシーの引用や言い換えだけ",
    },
    plan: null,
  },
  学びの設計書: {
    coherence: {
      label: "設計の筋",
      question: "出発点の問い → 学年ごとの学び → 卒業後 が一本につながっているか",
      lowSigns: "学年ごとの学びが並んでいるだけで、出発点の問いとつながらない",
    },
    insight: {
      label: "出発点の質",
      question: "学びの出発点が、本人の経験や観察から出た具体的な問いか",
      lowSigns: "一般的な社会問題を挙げただけ、きっかけが書かれていない",
    },
    fit: {
      label: "大学との対応",
      question:
        "その学部の学び（科目・ゼミ・制度）のどれを、どの順で使うか",
      lowSigns:
        "アドミッション・ポリシーの引用や言い換えだけ、賛辞だけ、科目名の羅列",
    },
    plan: {
      label: "学びの計画",
      question: "学年ごとに何をどう学ぶかが具体的か",
      lowSigns: "分野名だけ、「幅広く学びたい」",
    },
  },
};

/** 種類が分からないときは志望理由書の問いで見る */
export function documentAxisSpecs(
  documentType: string | undefined
): Record<DocumentReviewAxis, DocumentAxisSpec | null> {
  const spec = SPECS[documentType ?? ""] ?? SPECS["志望理由書"];
  return { ...spec, readability: READABILITY };
}

/** その種類の書類で学びの計画（plan）を採点するか */
export function documentAssessesPlan(documentType: string | undefined): boolean {
  return documentAxisSpecs(documentType).plan !== null;
}

// ---------------------------------------------------------------- 旧軸（読み取り専用）

const LEGACY_AXES = [
  { key: "apAlignment", field: "apAlignmentScore", label: "AP合致度", weight: 11 },
  { key: "structure", field: "structureScore", label: "構成", weight: 8 },
  { key: "originality", field: "originalityScore", label: "独自性", weight: 9 },
  { key: "learningPlan", field: "learningPlanScore", label: "学びの計画", weight: 7 },
  { key: "expression", field: "expressionScore", label: "表現", weight: 5 },
] as const;

const NEW_FIELDS: Record<DocumentReviewAxis, keyof DocumentFeedback> = {
  coherence: "coherenceScore",
  insight: "insightScore",
  fit: "fitScore",
  plan: "planScore",
  readability: "readabilityScore",
};

// ---------------------------------------------------------------- 並びと合計

export interface DocumentAxisScore {
  key: string;
  label: string;
  /** 合計40点の中での配点 */
  weight: number;
  /** 0-10。採点しない軸は null（分母から外す） */
  score: number | null;
}

export interface DocumentScoreLayout {
  /** v10 の軸か、それより前の軸か。前回との比較は同じ版どうしだけで行う */
  version: "v10" | "legacy";
  axes: DocumentAxisScore[];
  /** 目標字数の5割未満で、採点しなかった（書きかけ） */
  incomplete: boolean;
}

type ScoreSource = Partial<
  Pick<
    DocumentFeedback,
    | "coherenceScore"
    | "insightScore"
    | "fitScore"
    | "planScore"
    | "readabilityScore"
    | "incomplete"
    | "apAlignmentScore"
    | "structureScore"
    | "originalityScore"
    | "learningPlanScore"
    | "expressionScore"
  >
>;

/** 添削結果が v10 の軸で採点されたものか */
export function isV10Feedback(feedback: ScoreSource | null | undefined): boolean {
  if (!feedback) return false;
  return (
    feedback.incomplete === true ||
    typeof feedback.coherenceScore === "number" ||
    typeof feedback.insightScore === "number"
  );
}

/**
 * 添削結果から、画面に出す軸の並びを作る。v10 の書類は新しい軸、
 * それより前の書類は旧軸（AP合致度・構成・独自性・学びの計画・表現）で返す。
 */
export function documentScoreLayout(
  feedback: ScoreSource | null | undefined,
  documentType: string | undefined
): DocumentScoreLayout {
  if (!feedback) return { version: "v10", axes: [], incomplete: false };
  if (isV10Feedback(feedback)) {
    const specs = documentAxisSpecs(documentType);
    const axes = DOCUMENT_REVIEW_AXES.filter((axis) => specs[axis] !== null).map(
      (axis) => {
        const value = feedback[NEW_FIELDS[axis] as keyof ScoreSource];
        return {
          key: axis,
          label: specs[axis]!.label,
          weight: DOCUMENT_REVIEW_WEIGHTS[axis],
          score: typeof value === "number" ? value : null,
        };
      }
    );
    return { version: "v10", axes, incomplete: feedback.incomplete === true };
  }
  const axes = LEGACY_AXES.map((a) => {
    const value = feedback[a.field as keyof ScoreSource];
    return {
      key: a.key,
      label: a.label,
      weight: a.weight,
      score: typeof value === "number" ? value : null,
    };
  }).filter((a) => a.score !== null || a.key === "apAlignment");
  return { version: "legacy", axes, incomplete: false };
}

export interface DocumentTotal {
  /** 加重合計（採点できた軸のみ） */
  total: number;
  /** 満点（採点できた軸のみ） */
  max: number;
  /** 満点に対する割合(%)。ランク判定に使う */
  percentage: number;
  /** 採点しなかった軸（AP未取得など） */
  missing: DocumentAxisScore[];
  incomplete: boolean;
}

/**
 * 合計を出す。採点しなかった軸は分母からも外す（0点として扱うと、大学未設定
 * というだけで低評価になる）。書きかけは合計を出さない（percentage 0, max 0）。
 */
export function documentTotal(layout: DocumentScoreLayout): DocumentTotal {
  let total = 0;
  let max = 0;
  const missing: DocumentAxisScore[] = [];
  for (const axis of layout.axes) {
    if (axis.score === null) {
      missing.push(axis);
      continue;
    }
    total += axis.score * (axis.weight / 10);
    max += axis.weight;
  }
  return {
    total: Math.round(total),
    max,
    percentage: max > 0 ? Math.round((total / max) * 100) : 0,
    missing,
    incomplete: layout.incomplete,
  };
}

/** 点の欄（v10 と旧軸の両方）。API が一覧・版ごとに返す形 */
export type DocumentScoreFields = ScoreSource & { fillRate?: number | null };

const SCORE_FIELD_KEYS = [
  "coherenceScore",
  "insightScore",
  "fitScore",
  "planScore",
  "readabilityScore",
  "incomplete",
  "fillRate",
  "apAlignmentScore",
  "structureScore",
  "originalityScore",
  "learningPlanScore",
  "expressionScore",
] as const;

/** 添削結果から点の欄だけを抜き出す（一覧に講評や引用まで載せないため） */
export function pickDocumentScoreFields(
  feedback: Partial<DocumentFeedback> | null | undefined
): DocumentScoreFields | undefined {
  if (!feedback) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of SCORE_FIELD_KEYS) {
    if (feedback[key] !== undefined) out[key] = feedback[key];
  }
  return out as DocumentScoreFields;
}
