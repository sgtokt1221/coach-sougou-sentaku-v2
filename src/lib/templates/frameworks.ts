import type { FrameworkDefinition } from "@/lib/types/template";

export const FRAMEWORKS: FrameworkDefinition[] = [
  {
    type: "STAR",
    name: "STAR法",
    description: "状況→課題→行動→結果の順で経験を具体的に伝える構成。活動実績を軸にした書類に最適。",
    bestFor: ["自己推薦書", "学業活動報告書"],
    sections: [
      {
        id: "situation",
        title: "状況（Situation）",
        description: "どのような場面・背景で活動したかを描写します。",
        guidingQuestion: "その活動を始めたとき、どのような状況でしたか？",
        activityMapping: "motivation",
        placeholder: "例：高校2年生の秋、文化祭実行委員長に選ばれた。前年の来場者数が減少しており...",
      },
      {
        id: "task",
        title: "課題（Task）",
        description: "直面した課題や達成すべき目標を明確にします。",
        guidingQuestion: "解決すべき課題や目標は何でしたか？",
        activityMapping: "actions",
        placeholder: "例：来場者数を前年比120%に増やすこと、および地域との連携を強化すること...",
      },
      {
        id: "action",
        title: "行動（Action）",
        description: "課題に対してどのような行動を取ったかを具体的に述べます。",
        guidingQuestion: "具体的にどのような行動を取りましたか？",
        activityMapping: "actions",
        placeholder: "例：地域の商店街と連携し、合同イベントを企画。SNSでの告知活動も自ら主導して...",
      },
      {
        id: "result",
        title: "結果（Result）",
        description: "行動の結果と、そこから得た学びを述べます。",
        guidingQuestion: "結果としてどうなりましたか？何を学びましたか？",
        activityMapping: "results",
        placeholder: "例：来場者数は前年比135%を達成。地域との信頼関係も構築でき...",
      },
    ],
  },
  {
    type: "PREP",
    name: "PREP法",
    description: "結論→理由→具体例→結論で主張を明確に伝える構成。志望理由を端的に伝えたい場合に最適。",
    bestFor: ["志望理由書", "研究計画書"],
    sections: [
      {
        id: "point",
        title: "結論（Point）",
        description: "最も伝えたい主張・志望理由を冒頭で述べます。",
        guidingQuestion: "一番伝えたいことは何ですか？",
        activityMapping: "connection",
        placeholder: "例：私は貴学の○○学部で、△△の研究を通じて社会課題の解決に貢献したいと考えています。",
      },
      {
        id: "reason",
        title: "理由（Reason）",
        description: "結論に至った理由や背景を述べます。",
        guidingQuestion: "なぜそう考えるようになったのですか？",
        activityMapping: "motivation",
        placeholder: "例：高校時代の課題研究で○○に取り組む中で、△△という問題に気づき...",
      },
      {
        id: "example",
        title: "具体例（Example）",
        description: "理由を裏付ける具体的な経験やエピソードを述べます。",
        guidingQuestion: "その理由を具体的に裏付ける経験はありますか？",
        activityMapping: "results",
        placeholder: "例：実際に○○のフィールドワークでは、△△という発見があり、研究の意義を実感しました...",
      },
      {
        id: "point-again",
        title: "結論（再提示）",
        description: "結論を改めて述べ、将来の展望につなげます。",
        guidingQuestion: "大学での学びを通じて、将来どうなりたいですか？",
        activityMapping: "connection",
        placeholder: "例：以上の経験と問題意識から、貴学の○○学部で学ぶことが将来の目標実現に不可欠だと確信しています。",
      },
    ],
  },
  {
    type: "kishoutenketsu",
    name: "起承転結",
    description: "日本的な文章構成で、自然な流れで読み手を引き込む構成。志望理由書や学びの設計書に最適。",
    bestFor: ["志望理由書", "学びの設計書"],
    sections: [
      {
        id: "ki",
        title: "起（導入）",
        description: "テーマの導入。自分の原点となる経験や問題意識を述べます。",
        guidingQuestion: "あなたの探究の原点は何ですか？",
        activityMapping: "motivation",
        placeholder: "例：幼い頃から自然環境に関心があり、近所の川の水質悪化を目の当たりにしたことが原点です...",
      },
      {
        id: "shou",
        title: "承（展開）",
        description: "導入を受けて、関心がどう深まったかを展開します。",
        guidingQuestion: "その関心はどのように深まりましたか？",
        activityMapping: "actions",
        placeholder: "例：高校に入り、環境科学部で水質調査を始めました。データを分析する中で...",
      },
      {
        id: "ten",
        title: "転（転換）",
        description: "新たな気づきや視点の転換を述べます。",
        guidingQuestion: "活動を通じて、考え方が変わった瞬間はありますか？",
        activityMapping: "learnings",
        placeholder: "例：しかし調査を進めるうちに、技術的な解決だけでは不十分で、地域住民の意識改革も重要だと気づきました...",
      },
      {
        id: "ketsu",
        title: "結（結論）",
        description: "大学での学びと将来の展望を述べます。",
        guidingQuestion: "大学で何を学び、将来どう活かしたいですか？",
        activityMapping: "connection",
        placeholder: "例：貴学の○○学部で環境政策と科学の両面から学び、持続可能な地域づくりに貢献したいと考えています。",
      },
    ],
  },
  {
    type: "problem-solving",
    name: "問題解決型",
    description: "課題発見→分析→解決→展望の流れで研究志向を示す構成。研究計画書や学びの設計書に最適。",
    bestFor: ["研究計画書", "学びの設計書"],
    sections: [
      {
        id: "discovery",
        title: "課題発見",
        description: "社会や身近な場面で発見した問題・課題を述べます。",
        guidingQuestion: "どのような課題を見つけましたか？",
        activityMapping: "motivation",
        placeholder: "例：地域の高齢者施設でのボランティア経験から、介護人材不足という深刻な課題に気づきました...",
      },
      {
        id: "analysis",
        title: "分析",
        description: "課題の原因や背景を分析した過程を述べます。",
        guidingQuestion: "その課題の原因をどのように分析しましたか？",
        activityMapping: "actions",
        placeholder: "例：文献調査と現場へのインタビューを通じて、待遇だけでなく社会的評価の低さが根本原因であると分析しました...",
      },
      {
        id: "solution",
        title: "解決アプローチ",
        description: "自分なりの解決策や取り組みを述べます。",
        guidingQuestion: "どのような解決策を考え、実行しましたか？",
        activityMapping: "results",
        placeholder: "例：介護の魅力を発信するSNSプロジェクトを立ち上げ、現役介護士の声を動画で紹介しました...",
      },
      {
        id: "future",
        title: "展望",
        description: "大学での研究計画と将来の社会貢献を述べます。",
        guidingQuestion: "大学ではどのように研究を発展させたいですか？",
        activityMapping: "connection",
        placeholder: "例：貴学の社会福祉学科で、テクノロジーを活用した介護支援システムの研究に取り組みたいです...",
      },
      {
        id: "expected-outcomes",
        title: "期待される成果",
        description: "研究の社会的インパクトや目標を述べます。",
        guidingQuestion: "研究を通じてどのような成果を目指しますか？",
        activityMapping: "learnings",
        placeholder: "例：研究成果を政策提言につなげ、介護人材確保のための制度設計に貢献することを目標とします...",
      },
    ],
  },
  {
    type: "why-how-what",
    name: "WHY-HOW-WHAT（ゴールデンサークル）",
    description: "なぜ→どうやって→何をの順で、信念から行動を伝える構成。志望理由書や自己推薦書に最適。",
    bestFor: ["志望理由書", "自己推薦書"],
    sections: [
      {
        id: "why",
        title: "WHY（なぜ）",
        description: "根源的な動機・信念・価値観を述べます。",
        guidingQuestion: "あなたが大切にしている信念や価値観は何ですか？",
        activityMapping: "motivation",
        placeholder: "例：「全ての人が自分らしく生きられる社会を作りたい」という信念が、私の行動の原動力です...",
      },
      {
        id: "how",
        title: "HOW（どうやって）",
        description: "信念を実現するためにどのようなアプローチをしてきたかを述べます。",
        guidingQuestion: "その信念をどのように行動に移してきましたか？",
        activityMapping: "actions",
        placeholder: "例：高校では多文化共生をテーマに、留学生との交流イベントを企画・運営しました...",
      },
      {
        id: "what",
        title: "WHAT（何を）",
        description: "大学で具体的に何を学び、何を実現したいかを述べます。",
        guidingQuestion: "大学で具体的に何を学び、何を成し遂げたいですか？",
        activityMapping: "connection",
        placeholder: "例：貴学の国際関係学部で異文化コミュニケーション論を学び、将来はNGOで多文化共生社会の実現に取り組みます...",
      },
    ],
  },
];

export function getFrameworkByType(type: string): FrameworkDefinition | undefined {
  return FRAMEWORKS.find((f) => f.type === type);
}

export function getRecommendedFrameworks(documentType: string): FrameworkDefinition[] {
  return FRAMEWORKS.filter((f) => f.bestFor.includes(documentType as typeof f.bestFor[number]));
}
