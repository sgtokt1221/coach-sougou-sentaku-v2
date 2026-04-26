/**
 * チュートリアル（/tour/*）の各ページの tooltip ステップ定義。
 * 既存 demo-steps.ts の差し替え。実ルートに対して実コンポーネントの
 * data-tour 属性を指す。
 */

export interface TourTooltip {
  selector: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
}

export interface TourPage {
  /** 表示用タイトル */
  title: string;
  /** 次のページのパス。null なら最終ページ */
  next: string | null;
  /** 前のページ（戻る用） */
  prev: string | null;
  tooltips: TourTooltip[];
}

/** チュートリアルが進む順序 */
export const TOUR_ORDER = [
  "/tour/dashboard",
  "/tour/self-analysis",
  "/tour/universities",
  "/tour/skill-check",
  "/tour/essay/new",
  "/tour/documents",
  "/tour/interview/new",
  "/tour/complete",
];

export const TOUR_PAGES: Record<string, TourPage> = {
  "/tour/dashboard": {
    title: "ダッシュボード",
    prev: null,
    next: "/tour/self-analysis",
    tooltips: [
      {
        selector: "[data-tour='upcoming-session']",
        title: "次回セッション",
        description: "コーチとの面談予定がここに表示されます。Meet リンクからすぐ参加できます。",
      },
      {
        selector: "[data-tour='target-universities']",
        title: "志望校",
        description: "登録した志望校のアドミッションポリシーや日程が常に手元に表示されます。",
      },
      {
        selector: "[data-tour='growth-tree']",
        title: "自己分析の木",
        description:
          "7 ステップの自己分析がどこまで進んだかを木の成長で可視化。果実をクリックすると編集できます。",
      },
      {
        selector: "[data-tour='skill-rank-essay']",
        title: "小論文レベル",
        description: "スキルチェックのランクと推移。30 日経過でリマインドされます。",
      },
      {
        selector: "[data-tour='score-trend']",
        title: "スコア推移",
        description: "添削と模擬面接のスコアを 1 つのグラフで把握できます。",
      },
    ],
  },
  "/tour/self-analysis": {
    title: "自己分析",
    prev: "/tour/dashboard",
    next: "/tour/universities",
    tooltips: [
      {
        selector: "[data-tour='sa-tree']",
        title: "自己分析の木",
        description: "AIとの対話で自分の価値観・強み・原体験を 7 ステップで深掘りします。",
      },
      {
        selector: "[data-tour='sa-tab-workshop']",
        title: "ワークショップ",
        description: "ステップごとに AI がソクラテス式で質問を重ね、自分の言葉を引き出します。",
      },
    ],
  },
  "/tour/universities": {
    title: "志望校マッチング",
    prev: "/tour/self-analysis",
    next: "/tour/skill-check",
    tooltips: [
      {
        selector: "[data-tour='matching-input']",
        title: "プロフィール入力",
        description: "GPA・英語資格・興味を入れると、合致度の高い大学を自動で並べます。",
      },
    ],
  },
  "/tour/skill-check": {
    title: "スキルチェック",
    prev: "/tour/universities",
    next: "/tour/essay/new",
    tooltips: [
      {
        selector: "[data-tour='skillcheck-tabs']",
        title: "小論文 / 面接 の 2 軸",
        description: "それぞれ独立した実力判定テストを月 1 回受けられます。",
      },
      {
        selector: "[data-tour='skillcheck-hero']",
        title: "受験ボタン",
        description: "「受験する」を押すと AI 採点付きの本番形式テストが始まります。所要 20 分。",
      },
      {
        selector: "[data-tour='skillcheck-stats']",
        title: "成長の見える化",
        description: "受験回数・最新ランク・最新スコア・経過日数を一覧。月をまたいで自分の伸びを追えます。",
      },
    ],
  },
  "/tour/essay/new": {
    title: "小論文添削",
    prev: "/tour/skill-check",
    next: "/tour/documents",
    tooltips: [
      {
        selector: "[data-tour='essay-input']",
        title: "答案入力",
        description: "テーマ選択後、ここに答案を書く or 写真でアップロードします。",
      },
      {
        selector: "[data-tour='essay-coach']",
        title: "AIコーチ",
        description: "書きながらリアルタイムでヒントをもらえます。志望校 AP に合わせた添削。",
      },
    ],
  },
  "/tour/documents": {
    title: "出願書類",
    prev: "/tour/essay/new",
    next: "/tour/interview/new",
    tooltips: [
      {
        selector: "[data-tour='docs-list']",
        title: "書類一覧",
        description: "志望理由書・活動報告書など、大学別に必要書類が整理されています。",
      },
    ],
  },
  "/tour/interview/new": {
    title: "模擬面接",
    prev: "/tour/documents",
    next: "/tour/complete",
    tooltips: [
      {
        selector: "[data-tour='interview-mode']",
        title: "面接モード選択",
        description: "個人・集団討論・プレゼンの 3 形式から本番に近いものを選べます。",
      },
      {
        selector: "[data-tour='interview-input']",
        title: "音声 or テキスト",
        description: "音声モードでは AI 面接官と本物の会話形式で練習できます。",
      },
    ],
  },
  "/tour/complete": {
    title: "準備完了",
    prev: "/tour/interview/new",
    next: null,
    tooltips: [],
  },
};
