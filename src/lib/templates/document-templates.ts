import type { DocumentTemplate } from "@/lib/types/template";

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    documentType: "志望理由書",
    recommendedFrameworks: ["PREP", "kishoutenketsu", "why-how-what"],
    sampleStructure: `【志望理由書の基本構成】
1. 志望動機の核心（なぜこの大学・学部なのか）
2. 原体験・きっかけ（関心を持った背景）
3. 高校での取り組み（探究活動・課外活動）
4. 大学での学修計画（具体的に何を学びたいか）
5. 将来の展望（どう社会に貢献するか）`,
  },
  {
    documentType: "学業活動報告書",
    recommendedFrameworks: ["STAR", "kishoutenketsu"],
    sampleStructure: `【学業活動報告書の基本構成】
1. 活動の概要（何をしたか）
2. 活動の背景と動機（なぜ取り組んだか）
3. 具体的な取り組み内容（どう行動したか）
4. 成果と学び（何を得たか）
5. 今後への活かし方（大学でどう発展させるか）`,
  },
  {
    documentType: "研究計画書",
    recommendedFrameworks: ["problem-solving", "PREP"],
    sampleStructure: `【研究計画書の基本構成】
1. 研究テーマと問題意識
2. 先行研究の整理と自分の立ち位置
3. 研究方法・アプローチ
4. 期待される成果
5. 研究の社会的意義と将来展望`,
  },
  {
    documentType: "自己推薦書",
    recommendedFrameworks: ["STAR", "why-how-what"],
    sampleStructure: `【自己推薦書の基本構成】
1. 自己紹介と強みの提示
2. 強みを証明するエピソード
3. 困難を乗り越えた経験
4. 大学での目標と自分の強みの活かし方
5. 大学への貢献と将来ビジョン`,
  },
  {
    documentType: "学びの設計書",
    recommendedFrameworks: ["kishoutenketsu", "problem-solving"],
    sampleStructure: `【学びの設計書の基本構成】
1. 学びのテーマと出発点
2. これまでの探究プロセス
3. 大学での学修計画（1-4年次）
4. 学際的アプローチの方針
5. 学びの成果をどう社会に還元するか`,
  },
];

export function getDocumentTemplate(documentType: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.documentType === documentType);
}

/**
 * 自由記述（フレームワークを使わない）のときに、AIコーチへ渡す問いと
 * 入力欄のプレースホルダ。書類の種類ごとに変える。
 *
 * 以前は種類に関わらず「志望理由」を聞いていたため、自己推薦書や研究計画書でも
 * 志望理由書としての助言になっていた。
 */
const FREE_GUIDE_BY_TYPE: Record<string, { question: string; placeholder: string }> = {
  志望理由書: {
    question: "この文章で最も伝えたい志望理由は何ですか？",
    placeholder: "なぜこの大学・学部で学びたいのかを、自由に書いてください。",
  },
  学業活動報告書: {
    question: "報告する活動で、あなたが最も力を入れたことは何ですか？",
    placeholder: "取り組んだ活動と、そこで何をしたかを自由に書いてください。",
  },
  研究計画書: {
    question: "この計画で明らかにしたい問いは何ですか？",
    placeholder: "扱いたいテーマと、その問いに迫る方法を自由に書いてください。",
  },
  自己推薦書: {
    question: "あなたの強みと、それを裏づける経験は何ですか？",
    placeholder: "自分の強みと、それが表れた経験を自由に書いてください。",
  },
  学びの設計書: {
    question: "大学の4年間で、何をどう学んでいきたいですか？",
    placeholder: "学びたいテーマと、大学での学び方を自由に書いてください。",
  },
};

const FREE_GUIDE_FALLBACK = {
  question: "この書類で最も伝えたいことは何ですか？",
  placeholder: "書類の内容を自由に入力してください。",
};

export function freeGuidingQuestion(documentType: string | undefined): string {
  return (documentType && FREE_GUIDE_BY_TYPE[documentType]?.question)
    ?? FREE_GUIDE_FALLBACK.question;
}

export function freePlaceholder(documentType: string | undefined): string {
  return (documentType && FREE_GUIDE_BY_TYPE[documentType]?.placeholder)
    ?? FREE_GUIDE_FALLBACK.placeholder;
}
