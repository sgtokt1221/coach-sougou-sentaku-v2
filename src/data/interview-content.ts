/**
 * 面接コンテンツ・バンクの静的 seed（デフォルト値）。
 *
 * Firestore `interviewContent` 未設定/空のときのフォールバック、および superadmin UI の
 * 「初期データを投入」で Firestore へ流し込む元データ。GD（集団討論）は既存の
 * `src/data/gd-themes.ts` を流用してこの seed に取り込む。
 */

import type { InterviewContentItem, ContentMode } from "@/lib/types/interview-content";
import { GD_THEMES, type GdThemeCategory } from "@/data/gd-themes";

/** seed の作成日時（決定的に固定）。 */
const SEED_DATE = "2026-06-16T00:00:00.000Z";

function item(
  mode: ContentMode,
  id: string,
  title: string,
  category?: string,
  description?: string,
  facultyId?: string | null,
): InterviewContentItem {
  return {
    id,
    mode,
    title,
    ...(description ? { description } : {}),
    ...(category ? { category } : {}),
    ...(facultyId !== undefined ? { facultyId } : {}),
    active: true,
    createdAt: SEED_DATE,
  };
}

/** GD カテゴリ(enum) → UI 表示ラベル。 */
const GD_CATEGORY_LABEL: Record<GdThemeCategory, string> = {
  general: "一般",
  society: "社会",
  science_tech: "科学技術",
  education: "教育",
  global: "国際",
  medical_life: "医療・生命",
  economy: "経済・ビジネス",
  humanities: "文化・人文",
  environment: "環境",
};

/** GD テーマを共通 InterviewContentItem 形へ変換。 */
const GD_SEED: InterviewContentItem[] = GD_THEMES.map((t) =>
  item(
    "group_discussion",
    `gd-${t.id}`,
    t.theme,
    GD_CATEGORY_LABEL[t.category],
    t.description,
  ),
);

/** 個人面接: 想定質問バンク。 */
const INDIVIDUAL_SEED: InterviewContentItem[] = [
  item("individual", "ind-motivation", "本学・本学部を志望した理由を教えてください。", "志望理由"),
  item("individual", "ind-why-here", "他大学ではなく本学でなければならない理由は何ですか。", "志望理由"),
  item("individual", "ind-self-pr", "あなたの強みと、それを示す具体的な経験を教えてください。", "自己PR"),
  item("individual", "ind-weakness", "自分の弱みは何ですか。どう向き合っていますか。", "自己PR"),
  item("individual", "ind-academic", "本学部で特に学びたいこと・研究したいテーマは何ですか。", "学問への関心"),
  item("individual", "ind-future", "卒業後、学んだことをどう社会で活かしたいですか。", "将来像"),
  item("individual", "ind-highschool", "高校生活で最も力を入れたことと、そこから得たものは何ですか。", "高校生活"),
  item("individual", "ind-news", "最近関心を持った社会の出来事と、それについての考えを教えてください。", "時事"),
];

/** 口頭試問: 分野別問題バンク（category=系統。facultyId は任意）。 */
const ORAL_SEED: InterviewContentItem[] = [
  item("oral_exam", "oral-hum-language", "言葉が人の思考に与える影響について、あなたの考えを述べてください。", "人文"),
  item("oral_exam", "oral-soc-democracy", "民主主義における多数決の利点と問題点を説明してください。", "社会"),
  item("oral_exam", "oral-sci-scientific-method", "科学的に「正しい」とはどういうことか説明してください。", "理工"),
  item("oral_exam", "oral-sci-energy", "再生可能エネルギーの利点と課題を技術的観点から述べてください。", "理工"),
  item("oral_exam", "oral-med-prevention", "予防医学が重要とされる理由を説明してください。", "医療・生命"),
  item("oral_exam", "oral-edu-motivation", "学習意欲を高めるために重要な要素は何だと考えますか。", "教育"),
  item("oral_exam", "oral-global-culture", "異文化を理解する上で最も大切なことは何ですか。", "国際"),
];

/** プレゼン: 質疑観点バンク（面接官が突くべき観点）。 */
const PRESENTATION_SEED: InterviewContentItem[] = [
  item("presentation", "pres-logic", "主張と根拠のつながりは論理的か（飛躍がないか）を問う。", "論理構成"),
  item("presentation", "pres-evidence", "提示したデータ・事例の出典と信頼性を問う。", "データ・根拠"),
  item("presentation", "pres-originality", "他にはない独自の視点・着眼点はどこかを問う。", "独自性"),
  item("presentation", "pres-feasibility", "提案の実現可能性・具体的な手順を問う。", "実現可能性"),
  item("presentation", "pres-counter", "反対意見や想定される批判にどう答えるかを問う。", "質疑応答"),
];

/** スキルチェック: 社会テーマバンク（汎用・大学非依存）。 */
const SKILL_CHECK_SEED: InterviewContentItem[] = [
  item("skill_check", "sc-ai", "AIの普及は社会にとって良いことか。", "科学技術"),
  item("skill_check", "sc-sns", "SNSは人と人のつながりを豊かにしているか。", "社会"),
  item("skill_check", "sc-online-edu", "オンライン教育は対面教育に代わりうるか。", "教育"),
  item("skill_check", "sc-environment", "環境保護と経済成長は両立できるか。", "環境"),
  item("skill_check", "sc-volunteer", "ボランティア活動は義務化すべきか。", "社会"),
  item("skill_check", "sc-happiness", "豊かさとは何かを自分の言葉で説明してください。", "一般"),
];

/** 全モード結合 seed。 */
export const INTERVIEW_CONTENT_SEED: InterviewContentItem[] = [
  ...GD_SEED,
  ...INDIVIDUAL_SEED,
  ...ORAL_SEED,
  ...PRESENTATION_SEED,
  ...SKILL_CHECK_SEED,
];

/** モードで絞り込んだ seed を返す。 */
export function seedForMode(mode: ContentMode): InterviewContentItem[] {
  return INTERVIEW_CONTENT_SEED.filter((i) => i.mode === mode);
}
