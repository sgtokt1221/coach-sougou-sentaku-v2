export interface WeaknessProgress {
  weakness: string;
  previousScore: number;
  currentScore: number;
  status: "improved" | "stable" | "declined";
  attempts: number;
}

/**
 * 弱点や過去テーマから AI が派生させた類題。
 * 小論文: 短いテーマ / 面接: 短い質問。
 * 講師が編集モードで追加・削除・修正可能。
 */
export interface PracticeQuestion {
  id: string;
  type: "essay" | "interview";
  /**
   * 優先度。primary は授業中に取り組む必須類題、secondary は宿題用の補助。
   * 既存類題には未設定がありえるため optional 扱い (UI 側で undefined を secondary 扱い)。
   * Phase 2 以降は `usage` を使う。`priority` は旧データ互換のため残す。
   */
  priority?: "primary" | "secondary";
  /** 題目 / 質問文 (30〜50 字程度の短文) */
  title: string;
  /** 関連弱点 (なぜこれを薦めるかの 1 文)。新仕様では必須だが、既存類題互換のため optional */
  relatedWeakness?: string;
  /** 関連する過去のテーマ・質問 (任意) */
  relatedPastTopic?: string;
  /**
   * 解答例。primary は必須生成、secondary は省略可。
   * 小論文: 400-500 字 (主張 / 理由 / 具体例 / 結論)、面接: 80-150 字
   */
  modelAnswer?: string;

  // ---- Phase 2 拡張 (すべて optional / 後方互換) ----

  /**
   * 用途分類。lesson=授業中、homework=宿題、extra=予備。
   * 旧データは priority から resolveUsage() で推定する。
   */
  usage?: "lesson" | "homework" | "extra";
  /** 難易度 (AI 判定)。生徒スコア・資格レベルから推定される */
  difficulty?: "basic" | "standard" | "advanced";
  /** 目安取り組み時間 (分)。授業中の時間配分に使う */
  estimatedMinutes?: number;
  /** この問題で何を鍛えるかの目的 (1 文) */
  objective?: string;
  /** 評価観点 / 採点ルブリック (3-5 項目) */
  rubric?: string[];
  /** 足場かけ / ヒント (生徒に与える誘導) */
  hints?: string[];
  /** 講師向けメモ (授業中の問いかけ・注意点) */
  teacherNotes?: string;
  /**
   * 解答例の公開範囲。サーバー側で usage から固定設定 (Phase 2 では AI 判定させない)。
   * - lesson / extra → teacher_only
   * - homework → after_submission
   */
  answerVisibility?: "teacher_only" | "after_submission" | "student_visible";
  /** 表示順序。サーバー側で生成時に連番付与 */
  order?: number;
  /**
   * 宿題として配布できるか。 admin が手動で判定する。
   * 未設定 (undefined) は default で true 扱い (= 配布可、 後方互換)。
   * 短答系 (例: 「30秒で述べ直して」) など模擬面接や小論文として成立しないものは false。
   */
  homeworkAssignable?: boolean;
}

export interface GrowthReport {
  id: string;
  studentId: string;
  studentName: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  generatedAt: string;
  essayStats: {
    count: number;
    avgScore: number;
    scoreChange: number;
    bestCategory: string;
    worstCategory: string;
    /** 期間内 essays の項目別平均 (各 0-10、レーダーチャート用)。古いレポートには無い */
    categoryAverages?: {
      structure: number;
      logic: number;
      expression: number;
      apAlignment: number;
      originality: number;
    };
  };
  interviewStats: {
    count: number;
    avgScore: number;
    scoreChange: number;
    /** 期間内 interviews の項目別平均 (各 0-10、レーダーチャート用)。古いレポートには無い */
    categoryAverages?: {
      clarity: number;
      apAlignment: number;
      enthusiasm: number;
      specificity: number;
      bodyLanguage: number;
    };
  };
  weaknessProgress: WeaknessProgress[];
  recommendations: string[];
  overallAssessment: string;
  /** 期間内の授業から抽出した観察 (レッスンシート実装後に付与) */
  sessionSummary?: {
    totalCount: number;
    mainTopics: string[];
    teacherObservations: string[];
    newWeaknessAreas: string[];
    latestNextAgenda?: string;
  };

  // ---- 講師編集対応の拡張 (すべて任意、後方互換) ----

  /** AI が弱点・過去問から生成した類題 (講師編集可) */
  practiceQuestions?: PracticeQuestion[];

  /** 講師の独自コメント。AI 生成内容とは別レイヤーで表示 */
  teacherComment?: string;
  /** 最終編集者の uid (admin/teacher) */
  editedBy?: string;
  /** 最終編集日時 (ISO8601) */
  editedAt?: string;
  /** 生徒に公開するか (デフォルト true、false なら生徒の成長タブに出ない) */
  sharedWithStudent?: boolean;
}

export interface GrowthReportSummary {
  id: string;
  studentId: string;
  studentName: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  generatedAt: string;
  essayCount: number;
  interviewCount: number;
  essayScoreChange: number;
  interviewScoreChange: number;
  overallAssessment: string;
  /**
   * 類題 (practiceQuestions) が 1 件以上保存されているか。
   * - 一括生成 (batch) は AI コスト抑制のため類題を生成しないので常に false
   * - latest API は Firestore 上の保存内容から判定
   * - 未設定 (undefined) のレガシー summary は UI 上はバッジを出さない
   */
  hasPracticeQuestions?: boolean;
}

export interface GenerateReportRequest {
  studentId: string;
  period: "weekly" | "monthly";
}

export interface BatchReportRequest {
  period: "weekly" | "monthly";
}
