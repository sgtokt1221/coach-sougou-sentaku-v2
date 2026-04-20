export interface TutorialTooltip {
  /** CSS selector for the element to highlight */
  selector: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
}

export interface DemoStepConfig {
  /** Display title (shown in progress header) */
  title: string;
  /** Route of this demo page */
  route: string;
  /** Next route (null = terminal) */
  nextRoute: string | null;
  /** Tooltip steps for driver.js */
  tooltips: TutorialTooltip[];
}

export const DEMO_ROUTE_ORDER = [
  "/student/demo/dashboard",
  "/student/demo/self-analysis",
  "/student/demo/universities",
  "/student/demo/topic-input",
  "/student/demo/essay-themes",
  "/student/demo/essay",
  "/student/demo/documents",
  "/student/demo/interview-drill",
  "/student/demo/interview",
  "/student/demo/complete",
];

export const DEMO_STEPS: Record<string, DemoStepConfig> = {
  dashboard: {
    title: "ダッシュボード",
    route: "/student/demo/dashboard",
    nextRoute: "/student/demo/self-analysis",
    tooltips: [
      {
        selector: "[data-tour='growth-tree']",
        title: "成長の木",
        description:
          "あなたの学習量と成長度が1本の木で可視化されます。添削や面接をこなすたびに木が育ちます。",
      },
      {
        selector: "[data-tour='recent-essays']",
        title: "直近の添削",
        description:
          "提出した小論文のスコア推移をすぐに確認できます。タップすると詳細へ飛べます。",
      },
      {
        selector: "[data-tour='weekly-todo']",
        title: "今週やること",
        description:
          "弱点や書類期限から、今週あなたが重点的に取り組むべきタスクをAIが提案します。",
      },
    ],
  },
  "self-analysis": {
    title: "自己分析",
    route: "/student/demo/self-analysis",
    nextRoute: "/student/demo/universities",
    tooltips: [
      {
        selector: "[data-tour='sa-steps']",
        title: "7ステップ自己分析",
        description:
          "価値観 → 強み → 弱み → 原体験 → 興味関心 → 将来像 → 志望理由、の順にAIと対話します。",
      },
      {
        selector: "[data-tour='sa-chat']",
        title: "AIがあなたを深掘り",
        description:
          "追加質問を重ねて、志望理由書や面接で使える「自分の言葉」を引き出します。",
      },
    ],
  },
  universities: {
    title: "志望校マッチング",
    route: "/student/demo/universities",
    nextRoute: "/student/demo/topic-input",
    tooltips: [
      {
        selector: "[data-tour='match-result']",
        title: "適合度スコア",
        description:
          "あなたのプロフィールと大学のアドミッション・ポリシーを照合し、合致度を％で算出。",
      },
      {
        selector: "[data-tour='match-reason']",
        title: "マッチ理由",
        description:
          "なぜ合うのか/合わないのか、AP上の根拠をセットで表示します。",
      },
    ],
  },
  "topic-input": {
    title: "ネタインプット",
    route: "/student/demo/topic-input",
    nextRoute: "/student/demo/essay-themes",
    tooltips: [
      {
        selector: "[data-tour='topic-faculty']",
        title: "学部別の時事ネタ",
        description:
          "志望学部ごとに頻出の時事テーマ・論点をストックしておけます。小論文・面接の「引き出し」。",
      },
      {
        selector: "[data-tour='topic-card']",
        title: "要点まとめ",
        description:
          "各ネタに背景・論点・対立意見が整理されているので、短時間でインプット可能。",
      },
    ],
  },
  "essay-themes": {
    title: "テーマ・過去問",
    route: "/student/demo/essay-themes",
    nextRoute: "/student/demo/essay",
    tooltips: [
      {
        selector: "[data-tour='themes-list']",
        title: "学部別テーマ",
        description:
          "学部ごとの頻出テーマをレベル別・分野別に一覧できます。「まず何を書こう」が決まります。",
      },
      {
        selector: "[data-tour='past-question']",
        title: "過去問",
        description:
          "実際に出題された過去問に挑戦できます。制限時間・文字数も本番と同じ。",
      },
    ],
  },
  essay: {
    title: "小論文添削",
    route: "/student/demo/essay",
    nextRoute: "/student/demo/documents",
    tooltips: [
      {
        selector: "[data-tour='essay-score']",
        title: "4軸スコア",
        description:
          "論理性・構成・表現力・AP合致度の4軸で採点。合計100点満点で可視化されます。",
      },
      {
        selector: "[data-tour='essay-good']",
        title: "良い点",
        description:
          "AIが見つけた強みを明示。自分の「武器」を把握できます。",
      },
      {
        selector: "[data-tour='essay-improve']",
        title: "改善点",
        description:
          "具体的にどこを直せば点数が上がるか、アクションレベルで指摘します。",
      },
    ],
  },
  documents: {
    title: "志望理由書",
    route: "/student/demo/documents",
    nextRoute: "/student/demo/interview-drill",
    tooltips: [
      {
        selector: "[data-tour='docs-progress']",
        title: "完成度ゲージ",
        description:
          "提出必要書類ごとに、文字数・ステータスで完成度を可視化します。",
      },
      {
        selector: "[data-tour='docs-feedback']",
        title: "3軸AI添削",
        description:
          "AP合致度・構成・独自性の3軸で添削。小論文より深い構造評価。",
      },
    ],
  },
  "interview-drill": {
    title: "面接ドリル",
    route: "/student/demo/interview-drill",
    nextRoute: "/student/demo/interview",
    tooltips: [
      {
        selector: "[data-tour='drill-categories']",
        title: "カテゴリ別ドリル",
        description:
          "志望理由・自己PR・学問関心など、カテゴリを選んで5分だけ練習できます。",
      },
      {
        selector: "[data-tour='drill-score']",
        title: "即時フィードバック",
        description:
          "回答に対してAIが5点満点で評価、改善例まで提示します。",
      },
    ],
  },
  interview: {
    title: "模擬面接",
    route: "/student/demo/interview",
    nextRoute: "/student/demo/complete",
    tooltips: [
      {
        selector: "[data-tour='interview-chat']",
        title: "本番形式の対話",
        description:
          "AI面接官と音声 or テキストで対話。志望校のAPに沿った質問が来ます。",
      },
      {
        selector: "[data-tour='interview-score']",
        title: "4軸評価",
        description:
          "明確さ・AP合致度・熱意・具体性の4軸で採点。終了後に全ログも保存されます。",
      },
    ],
  },
  complete: {
    title: "準備完了",
    route: "/student/demo/complete",
    nextRoute: null,
    tooltips: [],
  },
};
