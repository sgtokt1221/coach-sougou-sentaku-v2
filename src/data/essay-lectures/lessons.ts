import type { EssayLecture } from "./types";

/**
 * 小論文の基礎を学ぶ全8講。講義 → 関連問題（提出すると添削履歴に残る）。
 * 学部非依存の普遍的な「書き方」の基礎を、易→難で配列する。
 */
export const ESSAY_LECTURES: EssayLecture[] = [
  {
    id: "essay-basics-01",
    order: 1,
    level: "基礎",
    title: "小論文とは何か",
    summary: "作文・感想文との違いと、採点される5つの観点を知る",
    durationMin: 8,
    sections: [
      {
        id: "s1",
        heading: "作文・感想文との違い",
        body: "小論文は「問いに対する自分の主張を、理由と根拠で説得する文章」です。感想文が気持ちを述べるのに対し、小論文は論理を組み立てて読み手を納得させることがゴールです。",
      },
      {
        id: "s2",
        heading: "採点される5つの観点",
        body: "構成（序論・本論・結論の流れ）／論理（主張と理由のつながり）／表現（誤字・文末・読みやすさ）／AP合致（大学が求める人物像との一致）／独自性（自分ならではの視点）。この5つを意識して書くと評価が安定します。",
      },
      {
        id: "s3",
        heading: "結論から書く",
        body: "最初の段落で自分の立場（結論）を示すと、読み手は以降の文章を理解しやすくなります。迷ったら「結論先出し」が基本です。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "作文はできごとと気持ちを書く。小論文は問いに答えて、その理由を示す文章だ。まず違いを見る。",
        manuscript: {
          lines: [
            {
              text: "私は昨日、地域のボランティアに参加して楽しかった。",
              tone: "bad",
            },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "同じ題材でも、小論文はこう書く。「楽しかった」ではなく、問いへの答えから始まる。",
        manuscript: {
          lines: [
            {
              text: "地域活動に高校生が参加する意義はどこにあるか。",
              blockId: "question",
            },
            {
              text: "私は、担い手不足を補う点にあると考える。",
              blockId: "position",
              tone: "good",
            },
          ],
        },
        highlightBlock: "position",
      },
      {
        id: "s3",
        visual: "blocks",
        caption:
          "小論文は6つのブロックでできている。この講座では、この6つを1つずつ書けるようにしていく。",
        blocks: {
          filled: [
            "question",
            "position",
            "reason",
            "evidence",
            "concession",
            "conclusion",
          ],
        },
      },
      {
        id: "s4",
        visual: "blocks",
        caption:
          "採点は5つの観点で行われる。構成と論証はブロックの並びで決まり、表現力は文そのものの精度で決まる。",
        blocks: { filled: ["question", "position", "reason"] },
        highlightBlock: "reason",
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "配点が一番大きいのは構成と論証（各12点）。次が表現力（11点）。この講座はこの3つを順に埋めていく。",
        manuscript: {
          lines: [
            { text: "構成12点：ブロックの並び", tone: "normal" },
            { text: "論証12点：理由と根拠のつながり", tone: "normal" },
            {
              text: "表現力11点：てにをは・主述・一文の長さ",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "まずは今の力を見る。次の課題を200字で書いてみよう。うまく書けなくてよい。ここが出発点になる。",
        manuscript: {
          lines: [{ text: "（課題へ）", tone: "normal" }],
        },
      },
    ],
    // 1講はドリルを置かない。まず現状把握に集中させる
    keyTakeaways: [
      "小論文は主張＋理由＋根拠で説得する文章",
      "採点は構成・論理・表現・AP合致・独自性の5観点",
      "結論（主張）を先に示すと伝わりやすい",
    ],
    exercise: {
      prompt:
        "高校生が地域活動に参加する意義について、あなたの考えを200字以内で述べなさい。",
      wordLimit: 200,
      focusPoints: ["主張の明確さ", "説明の論理性"],
      blockId: null,
    },
  },
  {
    id: "essay-basics-02",
    order: 2,
    level: "基礎",
    title: "課題文の読み方",
    summary: "筆者の主張と論拠を正確につかみ、自分の意見と切り分ける",
    durationMin: 10,
    sections: [
      {
        id: "s1",
        heading: "筆者の主張を1文でつかむ",
        body: "課題文型では、まず筆者が何を言いたいか（主張）を1文で言えるようにします。「つまり」「したがって」の後に主張が来やすいので目印にしましょう。",
      },
      {
        id: "s2",
        heading: "主張を支える論拠を拾う",
        body: "主張の理由・根拠・具体例を拾います。これが後で自分の賛否を述べるときの材料になります。",
      },
      {
        id: "s3",
        heading: "要約と自分の意見を分ける",
        body: "課題文の要約と自分の意見を混同しないこと。まず筆者の論を正確に捉えてから、自分の立場を作ります。",
      },
    ],
    keyTakeaways: [
      "筆者の主張を1文で言えるようにする",
      "主張を支える論拠を拾う",
      "要約と自分の意見を区別する",
    ],
    exercise: {
      prompt:
        "次の短い文章を読み、筆者の主張を1文で、その根拠を2点、合わせて200字以内でまとめてください。\n\n【課題文】SNSは情報を素早く広める一方、誤情報も拡散しやすい。だから利用者は情報の出所を確かめる習慣を持つべきだ。",
      wordLimit: 200,
      focusPoints: ["筆者の主張の正確な把握", "根拠の抽出"],
    },
  },
  {
    id: "essay-basics-03",
    order: 3,
    level: "基礎",
    title: "設問分析",
    summary: "問われていることに正対し、条件を取りこぼさない",
    durationMin: 8,
    sections: [
      {
        id: "s1",
        heading: "問われていることに正対する",
        body: "「賛否を述べよ」「原因を論じよ」「あなたの考えを書け」では求められる答えが違います。設問の動詞に注目して、答え方を決めましょう。",
      },
      {
        id: "s2",
        heading: "条件をすべて拾う",
        body: "字数・観点・「具体例を挙げて」などの条件は採点対象です。守らないと内容が良くても減点されます。",
      },
      {
        id: "s3",
        heading: "いきなり書き始めない",
        body: "読む→構成メモ→書く→見直し、の順で進めます。構成メモを先に作ると、論理が崩れにくくなります。",
      },
    ],
    keyTakeaways: [
      "設問の動詞で答え方が決まる",
      "字数・条件は必ず守る",
      "構成メモを作ってから書く",
    ],
    exercise: {
      prompt:
        "次の設問について「答えるために何を書くべきか」と「守るべき条件」を箇条書きで整理してください（200字以内）。\n\n【設問】地方の人口減少にどう対応すべきか、具体策を一つ挙げてあなたの考えを述べよ（400字）。",
      wordLimit: 200,
      focusPoints: ["設問要求の把握", "条件の網羅"],
    },
  },
  {
    id: "essay-basics-04",
    order: 2,
    level: "基礎",
    title: "型の全体像",
    summary: "6つのブロックの並びと役割を知る",
    durationMin: 10,
    sections: [
      {
        id: "s1",
        heading: "序論・本論・結論",
        body: "序論＝主張の提示、本論＝理由と根拠で論証、結論＝主張の再確認。この型に沿うだけで論理が整います。",
      },
      {
        id: "s2",
        heading: "分量の目安は2:6:2",
        body: "序論2・本論6・結論2 程度のバランスが目安です。説得の中心は本論なので、ここを厚く書きます。",
      },
      {
        id: "s3",
        heading: "一段落一主張",
        body: "段落ごとに言いたいことを1つに絞ります。1段落に複数の論点を詰め込むと読みにくくなります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "blocks",
        caption:
          "答案は6ブロックの積み木でできている。上から順に置いていけば形になる。",
        blocks: {
          filled: [
            "question",
            "position",
            "reason",
            "evidence",
            "concession",
            "conclusion",
          ],
        },
      },
      {
        id: "s2",
        visual: "blocks",
        caption:
          "よくある失敗は、④根拠が抜けること。理由だけで具体例が無いと、感想と変わらない。",
        blocks: {
          filled: ["question", "position", "reason", "conclusion"],
          missing: ["evidence"],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s3",
        visual: "blocks",
        caption:
          "⑤譲歩と反論が抜けるのも多い。反対意見に触れない主張は、一方的に見える。",
        blocks: {
          filled: ["question", "position", "reason", "evidence", "conclusion"],
          missing: ["concession"],
        },
        highlightBlock: "concession",
      },
      {
        id: "s4",
        visual: "manuscript",
        caption: "6ブロックを実際の文にするとこうなる。ブロック名が左に出る。",
        manuscript: {
          lines: [
            {
              text: "問われているのは、オンライン教育を進めるべきかである。",
              blockId: "question",
            },
            { text: "私は進めるべきだと考える。", blockId: "position" },
            {
              text: "なぜなら、通学が難しい生徒にも学ぶ機会を開くからである。",
              blockId: "reason",
            },
            {
              text: "実際、私の高校では休校中に授業が続けられた。",
              blockId: "evidence",
            },
            {
              text: "確かに通信環境の差は残る。しかし機器の貸与で縮められる。",
              blockId: "concession",
            },
            {
              text: "したがって、条件を整えたうえで進めるべきである。",
              blockId: "conclusion",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "800字ならこの配分が目安。④根拠に一番字数を使う。ここが薄いと点が伸びない。",
        manuscript: {
          lines: [
            { text: "①問い120字 ②立場60字 ③理由160字", tone: "normal" },
            { text: "④根拠240字 ⑤譲歩140字 ⑥結論80字", tone: "good" },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "次の講から、このブロックを1つずつ書く練習をしていく。まずは並びを覚えよう。",
        blocks: {
          filled: [
            "question",
            "position",
            "reason",
            "evidence",
            "concession",
            "conclusion",
          ],
        },
      },
    ],
    drill: { kind: "subject_predicate" },
    keyTakeaways: [
      "答案は6ブロックの並びでできている",
      "抜けやすいのは④根拠と⑤譲歩と反論",
      "④根拠に一番字数を使う",
    ],
    exercise: {
      prompt:
        "次の答案を読み、6つのブロックのうちどれが欠けているかを指摘し、欠けているブロックを100字で書き足しなさい。\n\n「私はオンライン教育を進めるべきだと考える。なぜなら、場所を問わず学べるからだ。したがって進めるべきである。」",
      wordLimit: 150,
      focusPoints: ["型のブロックの理解", "根拠の具体性"],
      blockId: "evidence",
    },
  },
  {
    id: "essay-basics-05",
    order: 3,
    level: "基礎",
    title: "立場を決める",
    summary: "問いに直接答える。一つに決める",
    durationMin: 8,
    sections: [
      {
        id: "s1",
        heading: "立場は一つに決める",
        body: "「どちらとも言える」は説得力を欠きます。賛成か反対か、自分の軸を一つに決めましょう。",
      },
      {
        id: "s2",
        heading: "問いに正対する",
        body: "設問が聞いていることに直接答える主張にします。聞かれていないことを論じても評価されません。",
      },
      {
        id: "s3",
        heading: "主張は踏み込んで具体的に",
        body: "「良いと思う」で止めず、「〜だから導入すべきだ」と一歩踏み込みます。具体的な主張ほど論証しやすくなります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "一番多い失点はこれ。どちらとも取れる書き方は、立場を決めていないのと同じだ。",
        manuscript: {
          lines: [
            {
              text: "この問題については、賛成の面も反対の面もあると思う。",
              tone: "bad",
            },
          ],
        },
        highlightBlock: "position",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "立場は一つに決めて言い切る。迷いは⑤譲歩のブロックで書けばいい。",
        manuscript: {
          lines: [
            {
              text: "私は導入を進めるべきだと考える。",
              tone: "good",
              blockId: "position",
            },
          ],
        },
        highlightBlock: "position",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "設問が「是非を論じよ」なら是非を答える。ずれた答えは、内容が良くても点にならない。",
        manuscript: {
          lines: [
            { text: "設問：オンライン教育の是非を論じなさい", tone: "normal" },
            { text: "オンライン教育には多くの利点がある。", tone: "bad" },
            {
              text: "私はオンライン教育を進めるべきだと考える。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "「思う」で終えると弱い。小論文は「考える」「べきだ」で言い切る。",
        manuscript: {
          lines: [
            { text: "〜だと思います。", tone: "bad" },
            { text: "〜だと考える。／〜すべきである。", tone: "good" },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption:
          "②立場は答案の背骨。ここが決まると、③理由と⑥結論が自動的に決まる。",
        blocks: { filled: ["position", "reason", "conclusion"] },
        highlightBlock: "position",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "60字で書く。長く書く必要はない。一文で言い切れれば十分だ。",
        manuscript: {
          lines: [
            {
              text: "私は〜と考える。（60字）",
              tone: "good",
              blockId: "position",
            },
          ],
        },
      },
    ],
    drill: { kind: "subject_predicate" },
    keyTakeaways: [
      "立場は一つに決めて言い切る",
      "設問が聞いていることに直接答える",
      "文末は「考える」「べきである」",
    ],
    exercise: {
      prompt:
        "「高校生にスマートフォンの使用時間の制限は必要か」という問いに対し、あなたの立場を60字以内で書きなさい。理由は書かなくてよい。",
      wordLimit: 60,
      minLength: 20,
      focusPoints: ["立場の明確さ", "問いへの正対"],
      blockId: "position",
    },
  },
  {
    id: "essay-basics-06",
    order: 4,
    level: "実践",
    title: "理由を書く",
    summary: "主張の言い換えにしない。理由は一本に絞る",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "主張→理由→根拠／具体例",
        body: "「なぜなら」で理由を、「具体的には」で根拠や具体例を添えます。この順で積むと説得力が出ます。",
      },
      {
        id: "s2",
        heading: "根拠は具体的・検証可能に",
        body: "一般論より、データ・事実・経験など検証できる材料のほうが説得力を生みます。",
      },
      {
        id: "s3",
        heading: "論理の飛躍を避ける",
        body: "理由と主張のつながりが論理的かを確認します。「だから」でつないで違和感がないかをチェックしましょう。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "理由が主張の言い換えになっている例。これは何も説明していない。",
        manuscript: {
          lines: [
            { text: "私は制限が必要だと考える。", blockId: "position" },
            {
              text: "なぜなら、制限すべきだからである。",
              tone: "bad",
              blockId: "reason",
            },
          ],
        },
        highlightBlock: "reason",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "理由は「なぜそう言えるか」を別の言葉で説明する。主張に無い語が入るのが目印。",
        manuscript: {
          lines: [
            { text: "私は制限が必要だと考える。", blockId: "position" },
            {
              text: "なぜなら、睡眠時間の減少が学習の妨げになるからである。",
              tone: "good",
              blockId: "reason",
            },
          ],
        },
        highlightBlock: "reason",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "理由を並べすぎると全部が浅くなる。800字なら理由は一本、掘り下げる方がいい。",
        manuscript: {
          lines: [
            { text: "理由は3つある。第一に…第二に…第三に…", tone: "bad" },
            { text: "最も大きな理由は、睡眠時間の減少である。", tone: "good" },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "理由と主張の間が飛んでいないか確かめる。間に一段必要なことが多い。",
        manuscript: {
          lines: [
            { text: "スマホを使う → 成績が下がる", tone: "bad" },
            {
              text: "スマホを使う → 睡眠が減る → 授業の集中が落ちる → 成績が下がる",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption:
          "③理由は②立場と④根拠をつなぐ橋。ここが弱いと、根拠を足しても効かない。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "reason",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "100字で書く。「なぜなら〜だからである」の形に収める。",
        manuscript: {
          lines: [
            {
              text: "なぜなら〜だからである。（100字）",
              tone: "good",
              blockId: "reason",
            },
          ],
        },
      },
    ],
    drill: { kind: "sentence_length" },
    keyTakeaways: [
      "理由を主張の言い換えにしない",
      "理由は一本に絞って掘り下げる",
      "理由と主張の間が飛んでいないか確かめる",
    ],
    exercise: {
      prompt:
        "前の講で書いた「スマートフォンの使用時間の制限」についての立場に対し、その理由を100字以内で書きなさい。主張の言い換えにならないよう注意すること。",
      wordLimit: 100,
      minLength: 40,
      focusPoints: ["理由の説明力", "主張との非重複"],
      blockId: "reason",
    },
  },
  {
    id: "essay-basics-07",
    order: 7,
    level: "実践",
    title: "反論への配慮",
    summary: "想定反論を受け止めてから切り返し、説得力を高める",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "想定反論を出す",
        body: "自分の主張に対する反対意見を一つ想定すると、視野の広さが伝わります。",
      },
      {
        id: "s2",
        heading: "譲歩→再反論",
        body: "「確かに〜という意見もある。しかし〜」と、いったん受け止めてから切り返します。これが反論処理の型です。",
      },
      {
        id: "s3",
        heading: "多面的な主張は強い",
        body: "反論を踏まえた主張は一面的でなくなり、説得力が増します。",
      },
    ],
    keyTakeaways: [
      "想定反論を一つ挙げる",
      "譲歩（確かに）→再反論（しかし）",
      "多面的な主張は説得力が高い",
    ],
    exercise: {
      prompt:
        "「高校生にスマホは必要だ」というあなたの主張に対する想定反論を一つ挙げ、それに再反論する形で250字以内で書いてください。",
      wordLimit: 250,
      focusPoints: ["反論の的確さ", "再反論の論理"],
    },
  },
  {
    id: "essay-basics-08",
    order: 8,
    level: "実践",
    title: "推敲と原稿用紙ルール",
    summary: "文末・表記・原稿用紙のルールを整え、提出前に見直す",
    durationMin: 10,
    sections: [
      {
        id: "s1",
        heading: "文末と表記を整える",
        body: "文末は「だ・である」で統一します。話し言葉や略語は避けましょう。",
      },
      {
        id: "s2",
        heading: "一文を短く",
        body: "一文に主語と述語を一組が基本です。長すぎる文は二つに分けると読みやすくなります。",
      },
      {
        id: "s3",
        heading: "原稿用紙の基本",
        body: "段落の最初は一字下げ、句読点・促音の禁則に注意し、指定字数の8割以上は埋めます。",
      },
      {
        id: "s4",
        heading: "必ず見直す",
        body: "誤字脱字・主語と述語のねじれ・字数を、提出前に最後にもう一度確認します。",
      },
    ],
    keyTakeaways: [
      "文末は「である」調で統一",
      "一文を短く・主述を明確に",
      "禁則と一字下げ・字数は8割以上",
      "提出前に必ず見直す",
    ],
    exercise: {
      prompt:
        "次の文章を、小論文にふさわしい表現・文末・読みやすさに直して200字以内で書き直してください。\n\n【元の文】やっぱスマホって便利だと思うし、でも使いすぎると良くないかなって思ったりもするんだけど、まあ結局は使い方次第だよね。",
      wordLimit: 200,
      focusPoints: ["文末・表現の適切さ", "推敲による明確化"],
    },
  },
];
