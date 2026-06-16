/**
 * 面接コンテンツ・バンクの型。
 *
 * 各面接モードで AI が使う「お題/質問バンク」を superadmin が CRUD 管理するためのデータ。
 * 単一の Firestore コレクション `interviewContent` に全モードを格納し、`mode` で判別する。
 * Firestore 未設定/空のときは静的 seed (`src/data/interview-content.ts` /
 * `src/data/gd-themes.ts`) にフォールバックする。
 */

/** バンクを持つ面接モード。InterviewMode + アプリ層の skill_check。 */
export type ContentMode =
  | "group_discussion"
  | "individual"
  | "oral_exam"
  | "presentation"
  | "skill_check";

export interface InterviewContentItem {
  id: string;
  mode: ContentMode;
  /**
   * 主テキスト。モードにより意味が異なる:
   * GD=討論テーマ / 個人=想定質問 / 口頭試問=分野別問題 / プレゼン=質疑観点 / スキル=社会テーマ
   */
  title: string;
  /** 補足・ねらい（任意） */
  description?: string;
  /** モード別タグ（GD=分野, 個人=志望理由/自己PR 等, 口頭=分野） */
  category?: string;
  /** 任意スコープ（主に口頭試問の学部別）。null/未指定=全学部共通 */
  facultyId?: string | null;
  /** 論理削除フラグ。false で一覧・選定から除外 */
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

/** UI のモードタブ表示用ラベル。 */
export const CONTENT_MODE_LABELS: Record<ContentMode, string> = {
  group_discussion: "集団討論",
  individual: "個人面接",
  oral_exam: "口頭試問",
  presentation: "プレゼン",
  skill_check: "スキルチェック",
};

/** モード別の category 選択肢（UI のセレクト用。自由入力も許容する想定）。 */
export const CONTENT_CATEGORY_OPTIONS: Record<ContentMode, string[]> = {
  group_discussion: [
    "一般",
    "社会",
    "科学技術",
    "教育",
    "国際",
    "医療・生命",
    "経済・ビジネス",
    "文化・人文",
    "環境",
  ],
  individual: ["志望理由", "自己PR", "学問への関心", "将来像", "高校生活", "時事"],
  oral_exam: ["人文", "社会", "理工", "医療・生命", "教育", "国際", "学際"],
  presentation: ["論理構成", "データ・根拠", "独自性", "実現可能性", "質疑応答"],
  skill_check: ["社会", "教育", "科学技術", "環境", "一般"],
};
