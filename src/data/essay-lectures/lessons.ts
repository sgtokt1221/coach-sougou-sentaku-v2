import type { EssayLecture } from "./types";

/**
 * 小論文の基礎を学ぶ講座。講義アニメ → 文のドリル → 型のブロック課題 → AI添削。
 *
 * 1〜8講は「型を組む」まで一本の問い（スマートフォンの使用時間の制限）を通して進み、
 * 3〜7講で書いたブロックを8講で1本の答案につなぐ。
 * 9〜11講は「中身の質」で、悪い文と直した文の対比（compare）を主役にする。
 * 12〜14講は「読む・分析」。15〜18講は設問タイプ別の型でフル答案を書き、
 * 19講で推敲、20講で本番の時間配分まで到達する。
 *
 * id は既提出の答案（essays.lectureId）と紐づくため絶対に変えない。
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
          "同じ体験でも、作文は気持ちを書き、小論文は**問いへの答えを書く**。まず並べて見比べよう。",
        manuscript: {
          lines: [
            {
              text: "私は昨日、地域のボランティアに参加して楽しかった。",
              label: "作文",
            },
            {
              text: "高校生が地域活動に関わる意義は、担い手不足を補う点にある。",
              label: "小論文",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "小論文はまず問いを立て、**その答えを一文で言い切る**。「楽しかった」からは始めない。",
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
          "小論文は**6つのブロック**でできている。この講座では、この6つを1つずつ書けるようにしていく。",
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
          "ブロックは**上から順に決まっていく**。①問いが決まれば②立場が決まり、②が決まれば③理由が決まる。",
        blocks: { filled: ["question", "position", "reason"] },
        highlightBlock: "reason",
      },
      {
        id: "s5",
        visual: "diagram",
        caption:
          "50点の内訳。**構成と論証で半分近く**を占める。この講座はこの順に埋めていく。",
        diagram: {
          unit: "点",
          items: [
            { label: "構成", value: 12, note: "ブロックの並び" },
            { label: "論証", value: 12, note: "理由と根拠のつながり" },
            { label: "表現力", value: 11, note: "てにをは・主述・一文の長さ" },
            { label: "議論の成熟度", value: 10, note: "反対意見の扱い" },
            { label: "独自性", value: 5, note: "自分の視点" },
          ],
        },
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "まずは今の力を見る。次の問いに200字で答えてみよう。うまく書けなくてよい。ここが出発点になる。",
        manuscript: {
          lines: [
            {
              text: "高校生が地域活動に参加する意義について、あなたの考えを述べなさい。",
              label: "次の課題",
            },
          ],
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
          "答案は6ブロックの積み木でできている。**上から順に置いていけば形になる**。",
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
          "よくある失敗は、**④根拠が抜けること**。理由だけで具体例が無いと、感想と変わらない。",
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
          "**⑤譲歩と反論が抜ける**のも多い。反対意見に触れない主張は、一方的に見える。",
        blocks: {
          filled: ["question", "position", "reason", "evidence", "conclusion"],
          missing: ["concession"],
        },
        highlightBlock: "concession",
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "6ブロックを実際の文にするとこうなる。この順に並べれば、**そのまま一本の答案になる**。",
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
        visual: "diagram",
        caption: "800字ならこの配分が目安。**④根拠に一番字数を使う**。",
        diagram: {
          unit: "字",
          items: [
            { label: "①問い", value: 120 },
            { label: "②立場", value: 60 },
            { label: "③理由", value: 160 },
            { label: "④根拠・具体例", value: 240, note: "一番厚く書く" },
            { label: "⑤譲歩と反論", value: 140 },
            { label: "⑥結論", value: 80 },
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
          "一番多い失点はこれ。**どちらとも取れる書き方**は、立場を決めていないのと同じだ。",
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
          "立場は**一つに決めて言い切る**。迷いは⑤譲歩のブロックで書けばいい。",
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
          "設問が「是非を論じよ」なら是非を答える。ずれた答えは、**内容が良くても点にならない**。",
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
          "「思う」で終えると弱い。小論文は**「考える」「べきだ」で言い切る**。",
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
          "**②立場は答案の背骨**。ここが決まると、③理由と⑥結論が自動的に決まる。",
        blocks: { filled: ["position", "reason", "conclusion"] },
        highlightBlock: "position",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "60字で書く。長く書く必要はない。**一文で言い切れれば十分だ**。",
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
          "理由が**主張の言い換え**になっている例。これは何も説明していない。",
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
          "理由は「なぜそう言えるか」を別の言葉で説明する。**主張に無い語が入る**のが目印。",
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
          "理由を並べすぎると全部が浅くなる。800字なら**理由は一本、掘り下げる**方がいい。",
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
          "理由と主張の**間が飛んでいないか**確かめる。間に一段必要なことが多い。",
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
          "③理由は②立場と④根拠を**つなぐ橋**。ここが弱いと、根拠を足しても効かない。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "reason",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "100字で書く。**「なぜなら〜だからである」**の形に収める。",
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
    id: "essay-basics-09",
    order: 5,
    level: "実践",
    title: "根拠・具体例",
    summary: "一般論ではなく、事実・経験・数字で理由を支える",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "一般論は根拠にならない",
        body: "「多くの人が困っている」「近年問題になっている」は、誰に何が起きているかを言っていません。これは根拠ではなく、印象を書いただけです。",
      },
      {
        id: "s2",
        heading: "事実・経験・数字のどれかを置く",
        body: "調査結果や数字、自分が実際に見聞きした出来事を一つ置きます。出所を書ければさらに強くなります。",
      },
      {
        id: "s3",
        heading: "抽象語は具体に落とす",
        body: "「社会問題」「多様性」のような大きな言葉は、そのままでは中身が伝わりません。誰にどんなことが起きているかまで下ろして書きます。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "根拠のつもりで**一般論を書いた例**。誰がどう困っているのかが書かれていない。",
        manuscript: {
          lines: [
            {
              text: "実際、多くの人がスマートフォンの使いすぎで困っている。",
              tone: "bad",
              blockId: "evidence",
            },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "同じ題材でも、**数字と出所を置けば根拠になる**。「実際、」で始めるのが型だ。",
        manuscript: {
          lines: [
            {
              text: "実際、多くの人が困っている。",
              tone: "bad",
              blockId: "evidence",
            },
            {
              text: "実際、内閣府の調査では、高校生が一日にインターネットを使う時間は平均で六時間近くに達している。",
              tone: "good",
              blockId: "evidence",
            },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "自分の経験も根拠になる。ただし「大変だった」で終えず、**主張を支える形にする**。",
        manuscript: {
          lines: [
            {
              text: "私も部活の帰りにスマートフォンを見続けてしまい、大変だった。",
              tone: "bad",
              blockId: "evidence",
            },
            {
              text: "私は就寝前の使用をやめた一か月間、朝の眠気が減り、授業中に居眠りをしなくなった。",
              tone: "good",
              blockId: "evidence",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "「社会問題」のような大きな言葉は、それだけでは何も言っていない。**誰に何が起きているか**まで下ろす。",
        manuscript: {
          lines: [
            { text: "地方の人口減少は深刻な社会問題である。", tone: "bad" },
            {
              text: "地方では、進学で県外へ出た若者が戻らず、商店や病院の担い手が減っている。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption:
          "③理由と④根拠は**セットで働く**。理由だけで止めると、読み手は「本当にそうか」で終わってしまう。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "evidence",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "150字で書く。事実か経験を**一つだけ選び**、数を増やさずに詳しく書く。",
        manuscript: {
          lines: [
            { text: "実際、〜。（150字）", tone: "good", blockId: "evidence" },
          ],
        },
      },
    ],
    drill: { kind: "particle" },
    keyTakeaways: [
      "一般論ではなく事実・経験・数字を置く",
      "自分の経験は主張を支える形に書き直す",
      "抽象語は誰に何が起きているかまで落とす",
    ],
    exercise: {
      prompt:
        "前の講で書いた「スマートフォンの使用時間の制限」についての理由を支える根拠・具体例を、150字以内で書きなさい。自分の経験でも調べた事実でもよい。",
      wordLimit: 150,
      minLength: 60,
      focusPoints: ["根拠の具体性", "主張との関連"],
      blockId: "evidence",
    },
    relatedPractice: {
      label: "ちょこ添削",
      href: "/student/essay/choco",
      note: "1段落だけ書いて、根拠の書き方を試せます",
    },
  },
  {
    id: "essay-basics-07",
    order: 6,
    level: "実践",
    title: "譲歩と反論",
    summary: "反対側の最も強い言い分を書き、切り返して立場を強める",
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
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "反対意見にまったく触れない答案。筋は通っているが、**一方的に見えてしまう**。",
        manuscript: {
          lines: [
            {
              text: "私は使用時間の制限が必要だと考える。",
              blockId: "position",
            },
            {
              text: "なぜなら、就寝前の使用が睡眠時間を削るからである。",
              blockId: "reason",
            },
            { text: "したがって、制限すべきである。", blockId: "conclusion" },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "反対側を**いったん認めてから切り返す**。これが⑤譲歩と反論の型だ。",
        manuscript: {
          lines: [
            {
              text: "確かに、スマートフォンは調べ学習や連絡にも使われており、時間で一律に区切るのは乱暴である。",
              tone: "good",
              blockId: "concession",
            },
            {
              text: "しかし、制限を就寝前の時間帯だけに限れば、学習の妨げにはならない。",
              tone: "good",
              blockId: "concession",
            },
          ],
        },
        highlightBlock: "concession",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "わざと弱い反論を立てても点にならない。**相手の一番強い言い分**を自分で書く。",
        manuscript: {
          lines: [
            { text: "確かに、スマートフォンを使いたい人もいる。", tone: "bad" },
            {
              text: "確かに、緊急時の連絡手段まで制限するのは危険である。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "「確かに」で終えると、自分の立場まで揺らいで見える。**必ず「しかし」で戻す**。",
        manuscript: {
          lines: [
            {
              text: "確かに、緊急時に連絡が取れなくなる恐れはある。",
              tone: "normal",
            },
            { text: "だから、制限には難しい面もある。", tone: "bad" },
            {
              text: "しかし、通話だけを制限の対象から外せばこの心配は消える。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption:
          "⑤は譲るためのブロックではない。反論を処理して**②立場を強くする**ために置く。",
        blocks: {
          filled: [
            "position",
            "reason",
            "evidence",
            "concession",
            "conclusion",
          ],
        },
        highlightBlock: "concession",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "150字なら**二文で収まる**。「確かに」で一文、「しかし」で一文が目安だ。",
        manuscript: {
          lines: [
            {
              text: "確かに〜。しかし〜。（150字）",
              tone: "good",
              blockId: "concession",
            },
          ],
        },
      },
    ],
    drill: { kind: "particle" },
    keyTakeaways: [
      "相手の一番強い言い分を自分で書く",
      "「確かに」で終えず「しかし」で切り返す",
      "⑤譲歩と反論は②立場を強めるために置く",
    ],
    exercise: {
      prompt:
        "「スマートフォンの使用時間の制限」についてのあなたの立場に対する最も強い反論を一つ挙げ、それに応答する形で150字以内で書きなさい。",
      wordLimit: 150,
      minLength: 60,
      focusPoints: ["反論の的確さ", "切り返しの説得力"],
      blockId: "concession",
    },
  },
  {
    id: "essay-basics-10",
    order: 7,
    level: "実践",
    title: "結論",
    summary: "新しい話を足さず、立場を言い直して閉じる",
    durationMin: 8,
    sections: [
      {
        id: "s1",
        heading: "新情報を足さない",
        body: "結論で新しい話題を出すと、説明されないまま答案が終わってしまいます。結論に書くのは、本論で扱ったことだけです。",
      },
      {
        id: "s2",
        heading: "立場を言い直す",
        body: "②立場をそのまま写すのではなく、本論で足した条件を入れて言い直します。読み終えたときに答えが残ります。",
      },
      {
        id: "s3",
        heading: "字数を残しておく",
        body: "書いているうちに字数が尽き、結論が一行で終わる答案が多くあります。書き始める前に、結論の分を先に取り分けておきましょう。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "結論で**新しい話を始めた例**。触れただけで終わる話題は、書かないほうがよい。",
        manuscript: {
          lines: [
            {
              text: "したがって、就寝前の使用時間は制限すべきである。",
              blockId: "conclusion",
            },
            {
              text: "また、SNSでの誹謗中傷への対策も急がれる。",
              tone: "bad",
              blockId: "conclusion",
            },
          ],
        },
        highlightBlock: "conclusion",
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "②立場をそのまま写さない。**本論で足した条件を入れて**言い直すと、答案がまとまる。",
        manuscript: {
          lines: [
            {
              text: "私は使用時間の制限が必要だと考える。",
              blockId: "position",
            },
            {
              text: "したがって、就寝前の時間帯に限って使用を制限すべきである。",
              tone: "good",
              blockId: "conclusion",
            },
          ],
        },
        highlightBlock: "conclusion",
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "**決意表明で終えると**、問いに答えないまま閉じることになる。答えで終える。",
        manuscript: {
          lines: [
            { text: "私もこれから使い方を見直していきたい。", tone: "bad" },
            {
              text: "したがって、就寝前の使用は制限すべきである。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "⑤で書きすぎ、⑥が一行で終わった例。書き出す前に**結論の80字を取り分けておく**。",
        manuscript: {
          lines: [
            {
              text: "確かに緊急時には連絡が取れず困る場合もあり、学習に使う生徒もいるため一律の制限には慎重であるべきで、",
              tone: "bad",
            },
            { text: "制限は必要だ。", tone: "bad" },
          ],
        },
      },
      {
        id: "s5",
        visual: "blocks",
        caption:
          "②立場と⑥結論が同じことを言っているか、**提出前にこの二つを見比べる**。",
        blocks: { filled: ["position", "conclusion"] },
        highlightBlock: "conclusion",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "80字で書く。**「したがって〜である」**で言い切れば十分だ。",
        manuscript: {
          lines: [
            {
              text: "したがって、〜すべきである。（80字）",
              tone: "good",
              blockId: "conclusion",
            },
          ],
        },
      },
    ],
    drill: { kind: "sentence_length" },
    keyTakeaways: [
      "結論に新しい話題を足さない",
      "②立場を言い直して閉じる",
      "書き始める前に結論の字数を残しておく",
    ],
    exercise: {
      prompt:
        "これまでの講で書いた立場・理由・根拠・譲歩を踏まえ、「スマートフォンの使用時間の制限」についての結論を80字以内で書きなさい。",
      wordLimit: 80,
      minLength: 30,
      focusPoints: ["立場との一貫性", "新情報を足さないこと"],
      blockId: "conclusion",
    },
  },
  {
    id: "essay-basics-11",
    order: 8,
    level: "実践",
    title: "ブロックをつなぐ",
    summary: "接続表現と段落の切り方で、6つのブロックを一本の答案にする",
    durationMin: 15,
    sections: [
      {
        id: "s1",
        heading: "接続表現は道しるべ",
        body: "「なぜなら」「実際」「確かに」「したがって」は、次に何が来るかを読み手に知らせる合図です。ブロックの切り替わりに置きます。",
      },
      {
        id: "s2",
        heading: "同じつなぎ方を繰り返さない",
        body: "「そして」を続けると幼い印象になります。関係に合わせて「その結果」「一方」などに変えるか、二文を一文にまとめます。",
      },
      {
        id: "s3",
        heading: "一段落一主張",
        body: "段落はブロックの切れ目で変えます。一つの段落に言いたいことを二つ入れると、どちらも印象に残りません。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "blocks",
        caption:
          "部品は六つともそろっている。並べただけでは文章にならないのは、**間をつなぐ言葉**が無いからだ。",
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
        visual: "manuscript",
        caption:
          "文が並んでいるだけの例。どれが主張で、どれがその理由なのかが**読み取れない**。",
        manuscript: {
          lines: [
            { text: "私は使用時間の制限が必要だと考える。" },
            { text: "就寝前の使用は睡眠時間を削る。" },
            { text: "高校生がインターネットを使う時間は一日に六時間近い。" },
          ],
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "「なぜなら」「実際」を足すだけで、**次に何が来るかが分かる**ようになる。",
        manuscript: {
          lines: [
            {
              text: "私は使用時間の制限が必要だと考える。",
              tone: "good",
              blockId: "position",
            },
            {
              text: "なぜなら、就寝前の使用が睡眠時間を削るからである。",
              tone: "good",
              blockId: "reason",
            },
            {
              text: "実際、高校生がインターネットを使う時間は一日に六時間近くに達している。",
              tone: "good",
              blockId: "evidence",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "**「そして」の連発**は幼く見える。つなぎ方を変えるか、一文にまとめる。",
        manuscript: {
          lines: [
            {
              text: "そして睡眠が減る。そして集中力が落ちる。そして成績が下がる。",
              tone: "bad",
            },
            {
              text: "就寝前の使用で睡眠が減る。その結果、授業中の集中力が落ち、成績にも表れる。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "段落は**ブロックの切れ目で変える**。一つの段落に言いたいことを二つ入れない。",
        manuscript: {
          lines: [
            { text: "第一段落：①問い＋②立場", tone: "normal" },
            { text: "第二段落：③理由＋④根拠", tone: "normal" },
            { text: "第三段落：⑤譲歩と反論", tone: "normal" },
            { text: "第四段落：⑥結論", tone: "normal" },
          ],
        },
      },
      {
        id: "s6",
        visual: "diagram",
        caption:
          "400字ならこの配分でつなぐ。これが**そのまま答案の骨格になる**。",
        diagram: {
          unit: "字",
          items: [
            { label: "②立場", value: 50 },
            { label: "③理由", value: 80 },
            { label: "④根拠・具体例", value: 120, note: "一番厚く書く" },
            { label: "⑤譲歩と反論", value: 100 },
            { label: "⑥結論", value: 50 },
          ],
        },
      },
    ],
    drill: { kind: "particle" },
    keyTakeaways: [
      "接続表現はブロックの切れ目に置く",
      "同じつなぎ方を繰り返さない",
      "段落はブロックの切れ目で変える",
    ],
    exercise: {
      prompt:
        "3〜7講で書いた各ブロックをつなぎ、「高校生にスマートフォンの使用時間の制限は必要か」についての答案を400字以内でまとめなさい。接続表現と段落の切り方に注意すること。",
      wordLimit: 400,
      minLength: 200,
      focusPoints: ["ブロックの接続", "段落構成", "一貫性"],
      blockId: null,
    },
  },
  {
    id: "essay-basics-12",
    order: 9,
    level: "実践",
    title: "事実と意見を分ける",
    summary: "確かめられることと、自分の判断を混ぜずに書く",
    durationMin: 10,
    sections: [
      {
        id: "s1",
        heading: "材料は事実・推測・意見の三つ",
        body: "事実は調査や記録で確かめられること、推測はまだ確かめていない見立て、意見はこうすべきだという判断です。三つは書き方が違うので、いま何を書いているかを自分で分かって書きます。",
      },
      {
        id: "s2",
        heading: "断定していい範囲",
        body: "「〜だからだ」と原因まで言い切れるのは、それを確かめたときだけです。確かめていないなら「〜と考えられる」「〜が指摘されている」と、推測の形で書きます。",
      },
      {
        id: "s3",
        heading: "評価の前に事実を置く",
        body: "「失敗だった」「深刻だ」は評価であって事実ではありません。何がどうだったのかを先に書き、そのあとで評価すると、判断に足場ができます。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "compare",
        caption:
          "原因まで言い切ってしまった例。投票率が低いことは確かめられるが、**なぜ低いかは確かめていない**。",
        compare: {
          before: "若者の投票率が低いのは、政治に関心がないからだ。",
          after:
            "若者の投票率は他の年代より低い。その理由の一つとして、政治との接点の少なさが指摘されている。",
          highlight: ["他の年代より", "指摘されている"],
          note: "断定を、事実と推測に分けた",
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "小論文で使う材料は**事実・推測・意見**の三つ。混ぜて書くと、どこまでが確かな話なのかが読み手に伝わらない。",
        manuscript: {
          lines: [
            { text: "事実：調査や記録で確かめられること", tone: "normal" },
            {
              text: "推測：たぶんそうだという見立て。まだ確かめていない",
              tone: "normal",
            },
            {
              text: "意見：こうすべきだという判断。書き手のもの",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "壊していると書いた時点で、**確かめようのない話**になる。事実の部分と判断の部分に切り分ける。",
        compare: {
          before: "SNSは人間関係を壊している。",
          after:
            "SNSでのやり取りは短い言葉になりやすい。そのことが誤解を生む場合があると私は考える。",
          highlight: ["短い言葉になりやすい", "私は考える"],
          note: "印象を、事実と判断に分けた",
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "**事実を先に置き**、そのあとで自分の判断を書く。順番が逆だと、判断が根拠なしに見える。",
        manuscript: {
          lines: [
            {
              text: "実際、内閣府の調査では、高校生が一日にインターネットを使う時間は平均で六時間近くに達している。",
              tone: "good",
              blockId: "evidence",
            },
            {
              text: "この時間の長さが睡眠を削る一因になっていると私は考える。",
              tone: "good",
            },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s5",
        visual: "compare",
        caption:
          "**失敗という言葉は評価**であって、事実ではない。何がどうだったのかを先に書く。",
        compare: {
          before: "この制度は失敗だった。",
          after:
            "この制度は、利用者が想定していた人数に届かなかった。目的を達したとは言いがたい。",
          highlight: ["利用者が想定していた人数に届かなかった", "言いがたい"],
          note: "評価の前に、起きたことを置いた",
        },
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "どちらかに偏った答案は、どちらも点が伸びない。**事実で支え、意見で言い切る**。",
        manuscript: {
          lines: [
            {
              text: "事実だけ：数字は並ぶが、何を言いたいのかが分からない",
              tone: "normal",
            },
            {
              text: "意見だけ：主張は伝わるが、そう言える理由が無い",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s7",
        visual: "blocks",
        caption:
          "**④根拠に置くのは事実**。②立場と③理由は、その事実をもとにした自分の意見だ。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "evidence",
      },
    ],
    drill: { kind: "style" },
    keyTakeaways: [
      "事実・推測・意見を分けて書く",
      "確かめていないことは推測の形で書く",
      "④根拠は事実、②立場は意見",
    ],
    exercise: {
      prompt:
        "次の文には、事実・推測・意見が混ざっています。三つに分けたうえで、④根拠として使える形に200字以内で書き直しなさい。\n\n【元の文】最近の高校生はスマートフォンばかり見ていて学力が下がっているので、学校での使用を禁止すべきだ。",
      wordLimit: 200,
      minLength: 80,
      focusPoints: ["事実と意見の区別", "断定の適切さ"],
      blockId: "evidence",
    },
    relatedPractice: {
      label: "論理ドリル",
      href: "/student/essay/logic-drill",
      note: "因果の取り違えや飛躍を見つける練習ができます",
    },
  },
  {
    id: "essay-basics-13",
    order: 10,
    level: "実践",
    title: "抽象語を具体に落とす",
    summary: "大きな言葉を、200字で論じられる大きさまで切る",
    durationMin: 10,
    sections: [
      {
        id: "s1",
        heading: "大きな言葉だけでは何も言っていない",
        body: "「社会問題」「多様性」「情報化社会」は、どの話にも当てはまる言葉です。そのまま並べても、読み手には中身が残りません。",
      },
      {
        id: "s2",
        heading: "誰の何の話かまで下ろす",
        body: "抽象語は、誰にどんなことが起きているかまで下ろします。段を下りるように、大きい言葉から具体へ二段、三段と落としていきます。",
      },
      {
        id: "s3",
        heading: "論点の大きさを字数に合わせる",
        body: "200字で「地域活性化」全体は論じられません。取り組みを一つに絞れば、同じ字数でも中身が書けます。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "大きな言葉だけで書いた答案。どの設問にも書ける一文は、**何も答えていない**のと同じだ。",
        manuscript: {
          lines: [
            { text: "設問：現代の社会問題について論じなさい", tone: "normal" },
            {
              text: "現代社会には多くの問題があり、その解決は重要な課題である。",
              tone: "bad",
            },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "多様性という言葉は、どの話にも使えてしまう。**誰の何の話なのか**まで下ろす。",
        compare: {
          before: "多様性を尊重する社会が必要だ。",
          after: "外国籍の子どもが母語で学べる環境を整える必要がある。",
          highlight: ["外国籍の子ども", "母語で学べる環境"],
          note: "誰の何の話かまで下ろした",
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "取り組むべきだ、では何をするのかが決まらない。**中身を一つ決める**と論じられる。",
        compare: {
          before: "地域活性化に取り組むべきだ。",
          after:
            "商店街の空き店舗を、高校生が使える学習スペースに変えるべきだ。",
          highlight: ["商店街の空き店舗", "高校生が使える学習スペース"],
          note: "取り組みの中身を一つに絞った",
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "大きな言葉から段を下りるように降ろしていく。四段目まで来れば、**200字で書ける**。",
        manuscript: {
          lines: [
            { text: "社会問題", tone: "normal" },
            { text: "→ 教育格差", tone: "normal" },
            { text: "→ 塾に通えるかどうかの差", tone: "normal" },
            { text: "→ 自宅でも同じ授業を受けられる仕組み", tone: "good" },
          ],
        },
      },
      {
        id: "s5",
        visual: "compare",
        caption:
          "課題は大きい、で止めると次の一文が書けない。**何が課題なのかを名指しする**。",
        compare: {
          before: "情報化社会の課題は大きい。",
          after: "検索結果の上位だけを読んで判断してしまう習慣が課題である。",
          highlight: ["検索結果の上位だけを読んで判断してしまう習慣"],
          note: "大きい・重要だ、で終わらせない",
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "**①問いを小さく切れば**、②以降は自然に決まる。書けないのは、たいてい問いが大きすぎるときだ。",
        blocks: { filled: ["question", "position", "reason", "evidence"] },
        highlightBlock: "question",
      },
    ],
    drill: { kind: "redundancy" },
    keyTakeaways: [
      "抽象語は誰の何の話かまで下ろす",
      "取り組むべきだ、で止めず中身を一つ決める",
      "①問いを小さく切ると書きやすくなる",
    ],
    exercise: {
      prompt:
        "「多様性」「地域活性化」「情報化社会」から一つ選び、200字で論じられる大きさまで具体化して、①問いの形で書きなさい（200字以内）。",
      wordLimit: 200,
      minLength: 80,
      focusPoints: ["抽象語の具体化", "論点の大きさ"],
      blockId: "question",
    },
    relatedPractice: {
      label: "論理ドリル",
      href: "/student/essay/logic-drill",
      note: "具体と抽象を行き来する型があります",
    },
  },
  {
    id: "essay-basics-14",
    order: 11,
    level: "実践",
    title: "自分の経験の使い方",
    summary: "感想で終わらせず、経験を主張の根拠に変える",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "感想ではなく、起きたことを書く",
        body: "「良い経験でした」「成長できました」では、何をした人なのかが伝わりません。何が起きて、自分がどう動いたかを書きます。",
      },
      {
        id: "s2",
        heading: "経験が何を裏づけるのかまで書く",
        body: "経験を書いたまま置いておくと、感想文になります。その経験が自分の主張のどこを支えるのかを、言葉にして続けます。",
      },
      {
        id: "s3",
        heading: "独自性は珍しさではない",
        body: "独自性の配点は5点です。珍しい体験を探す必要はありません。ありふれた出来事から自分が何を見たかを書ければ、それが独自性になります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "compare",
        caption:
          "良い経験でした、では何をした人なのか分からない。**何が起きて自分がどう動いたか**を書く。",
        compare: {
          before: "部活動を通して協調性を学びました。とても良い経験でした。",
          after:
            "合奏の練習方針で部員の意見が二つに割れたとき、私は両者の主張を紙に書き出して共通点を探した。",
          highlight: ["意見が二つに割れた", "紙に書き出して共通点を探した"],
          note: "感想を、起きたことに変えた",
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "**学びましたで終える書き方**は感想文の型だ。経験は主張を支えるために置く。",
        manuscript: {
          lines: [
            { text: "経験 → 学びました → 終わり", tone: "bad" },
            { text: "経験 → だから私はこう主張する", tone: "good" },
          ],
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "成長できた、は自分の話で終わっている。**その経験が何を裏づけるのか**まで書く。",
        compare: {
          before: "この経験から成長できました。",
          after:
            "この経験は、対立を減らすには判断の材料を共有することが有効だという私の主張を裏づけている。",
          highlight: ["判断の材料を共有する", "私の主張を裏づけている"],
          note: "経験が何を支えるのかを言い切った",
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "独自性の配点は5点。珍しい体験を探すのではなく、**自分が見たものを書けばよい**。",
        manuscript: {
          lines: [
            { text: "独自性＝珍しい経験を持っていること", tone: "bad" },
            {
              text: "独自性＝ありふれた出来事から、自分が何を見たかを書けること",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "compare",
        caption:
          "責任感が強いと自分で言っても、読み手は確かめられない。**行動を書けば伝わる**。",
        compare: {
          before: "私は責任感が強い人間です。",
          after:
            "当日の朝に欠席が出たとき、私は代役を引き受けて進行表を書き直した。",
          highlight: ["欠席が出たとき", "代役を引き受けて進行表を書き直した"],
          note: "性格の主張を、行動の記述に変えた",
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "**経験を置くのは④根拠**。②立場や⑥結論に混ぜると、主張全体が体験談に見えてしまう。",
        blocks: {
          filled: ["position", "reason", "evidence", "conclusion"],
        },
        highlightBlock: "evidence",
      },
    ],
    drill: { kind: "modifier" },
    keyTakeaways: [
      "経験は感想ではなく、起きたこととして書く",
      "その経験が何を裏づけるのかまで書く",
      "経験は④根拠に置く",
    ],
    exercise: {
      prompt:
        "「高校生に必要な力は何か」というあなたの主張を一つ決め、それを支える④根拠として自分の経験を200字以内で書きなさい。感想で終わらせないこと。",
      wordLimit: 200,
      minLength: 80,
      focusPoints: ["経験と主張の結びつき", "具体性"],
      blockId: "evidence",
    },
  },
  {
    id: "essay-basics-02",
    order: 13,
    level: "実践",
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
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "課題文を読んだら、まず**主張の一文を探す**。この四行で筆者が言いたいのは最後の一文だ。",
        manuscript: {
          lines: [
            { text: "情報が多い時代には、選ぶ力が要る。", tone: "normal" },
            {
              text: "目に入る記事をすべて読んでいては、一日が終わってしまう。",
              tone: "normal",
            },
            {
              text: "しかし、選ぶ基準を人任せにすると、見たいものだけが並ぶようになる。",
              tone: "normal",
            },
            {
              text: "したがって、自分が何を知りたいのかを先に決めてから読むべきだ。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "主張は**合図の言葉の後ろ**に置かれやすい。全文を読み直さず、この目印から探す。",
        manuscript: {
          lines: [
            {
              text: "「つまり」「したがって」「べきだ」の後ろ → 筆者の主張",
              tone: "good",
            },
            {
              text: "「例えば」「実際」「調査によれば」の後ろ → その論拠",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "要約に自分の賛否を混ぜると、筆者の主張が見えなくなる。**まず筆者の分だけ書く**。",
        compare: {
          before:
            "筆者は情報を選ぶ力が必要だと述べているが、私はその通りだと思う。",
          after:
            "筆者は、読む前に自分の知りたいことを決めるべきだと述べている。",
          highlight: ["読む前に", "知りたいことを決めるべきだ"],
          note: "自分の考えを外した",
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "課題文の言葉を並べただけでは要約にならない。**自分の言葉に置き換えて短くする**。",
        compare: {
          before:
            "情報が多い時代には選ぶ力が要り、選ぶ基準を人任せにすると見たいものだけが並ぶ。",
          after: "筆者は、選ぶ基準を他人に委ねる危うさを指摘している。",
          highlight: ["他人に委ねる危うさ", "指摘している"],
          note: "写さず、自分の言葉にした",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "課題文型では、①問いの位置に**筆者の主張の要約**が入る。そのうえで②立場を決める。",
        manuscript: {
          lines: [
            {
              text: "筆者は、読む前に自分の知りたいことを決めるべきだと述べている。",
              tone: "good",
              blockId: "question",
            },
            {
              text: "私はこの主張に賛成である。",
              tone: "good",
              blockId: "position",
            },
          ],
        },
        highlightBlock: "question",
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "課題文型で変わるのは**①が要約になること**だけだ。②から先は、今まで通りに書ける。",
        blocks: { filled: ["question", "position"] },
        highlightBlock: "question",
      },
    ],
    drill: { kind: "modifier" },
    keyTakeaways: [
      "筆者の主張を1文で言えるようにする",
      "要約と自分の意見を混ぜない",
      "課題文型では①問いが要約になる",
      "要約そのものは要約ドリルで練習できる",
    ],
    exercise: {
      prompt:
        "次の課題文を読み、筆者の主張とその論拠を150字以内で要約しなさい。自分の意見は書かないこと。\n\n【課題文】情報が多い時代には、選ぶ力が要る。目に入る記事をすべて読んでいては、一日が終わってしまう。しかし、選ぶ基準を人任せにすると、見たいものだけが並ぶようになる。したがって、自分が何を知りたいのかを先に決めてから読むべきだ。",
      wordLimit: 150,
      minLength: 60,
      focusPoints: ["筆者の主張の正確な把握", "要約と意見の分離"],
      blockId: "question",
    },
    relatedPractice: {
      label: "要約ドリル",
      href: "/student/essay/summary-drill",
      note: "要約だけを繰り返し練習できます",
    },
  },
  {
    id: "essay-basics-03",
    order: 12,
    level: "実践",
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
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "設問は、**書くべきことの一覧表**だ。読んだらまず、条件を数えて書き出す。",
        manuscript: {
          lines: [
            {
              text: "設問：地方の人口減少にどう対応すべきか、具体策を一つ挙げてあなたの考えを述べよ（400字）",
              tone: "normal",
            },
            { text: "条件1：具体策を一つ挙げる", tone: "good" },
            { text: "条件2：自分の考えを述べる", tone: "good" },
            { text: "条件3：400字に収める", tone: "good" },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "比較して論じよ、なら片方だけでは答えていない。**両方に触れてから立場を書く**。",
        compare: {
          before:
            "私はオンライン授業を進めるべきだと考える。場所を問わず学べるからである。",
          after:
            "対面授業とオンライン授業を比べると、学ぶ場所の自由さで後者が勝る。私はオンライン授業を進めるべきだと考える。",
          highlight: ["対面授業と", "比べると", "後者が勝る"],
          note: "比較の指定を拾った",
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "**設問の最後の動詞**で答え方が変わる。ここを読み飛ばすと、答案が丸ごとずれる。",
        manuscript: {
          lines: [
            {
              text: "説明しなさい → 事実を整理して伝える。賛否は要らない",
              tone: "normal",
            },
            {
              text: "論じなさい → 立場を決め、理由と根拠で支える",
              tone: "normal",
            },
            {
              text: "あなたの考えを述べなさい → 論じたうえで自分の判断を出す",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "設問をそのまま写した①は、何も決めていない。何を論じるのかを**自分の言葉で確定する**。",
        compare: {
          before: "地方の人口減少について論じる。",
          after:
            "本問が問うているのは、若者が戻らない地方で暮らしをどう支えるかである。",
          highlight: ["若者が戻らない", "暮らしをどう支えるか"],
          note: "設問を写さず、自分の言葉にした",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "書き終えたら設問に戻り、この三つを見る。内容が良くても**条件落ちは減点になる**。",
        manuscript: {
          lines: [
            { text: "字数：指定の八割を超えているか", tone: "normal" },
            { text: "観点：指定された観点に全部触れたか", tone: "normal" },
            {
              text: "具体例：挙げよと書かれていたら必ず入れる",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "設問分析は**①問いを作る作業**だ。ここが決まれば、②以降はぶれない。",
        blocks: { filled: ["question", "position", "reason"] },
        highlightBlock: "question",
      },
    ],
    drill: { kind: "style" },
    keyTakeaways: [
      "設問の動詞で答え方が決まる",
      "字数・条件は必ず守る",
      "設問を写さず、①問いを自分の言葉にする",
    ],
    exercise: {
      prompt:
        "次の設問について「答えるために何を書くべきか」と「守るべき条件」を整理し、そのうえで①問いを自分の言葉で書きなさい（200字以内）。\n\n【設問】地方の人口減少にどう対応すべきか、具体策を一つ挙げてあなたの考えを述べよ（400字）。",
      wordLimit: 200,
      minLength: 80,
      focusPoints: ["設問要求の把握", "条件の網羅"],
      blockId: "question",
    },
  },
  {
    id: "essay-basics-15",
    order: 14,
    level: "実践",
    title: "資料・データの読み取り",
    summary: "資料から言えることと、言えないことを分ける",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "読み取りと解釈を分ける",
        body: "資料に書かれている事実（読み取り）と、それが何を意味するかという判断（解釈）は別物です。まず数字をそのまま読み、そのあとで自分の解釈を続けます。",
      },
      {
        id: "s2",
        heading: "相関を因果と書かない",
        body: "二つの数字が同じ時期に増えていても、片方がもう片方の原因とは限りません。原因を言い切れるのは、資料がそれを示しているときだけです。",
      },
      {
        id: "s3",
        heading: "割合か実数かを確かめる",
        body: "割合が上がっても、人数が増えたとは限りません。母数そのものが減っていれば、割合と実数は逆に動きます。どちらの数字なのかを必ず確かめます。",
      },
      {
        id: "s4",
        heading: "資料に無いことは書かない",
        body: "資料に載っていない数字や範囲を持ち出すと、その部分だけ根拠が消えます。示された範囲の中で言い切ります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "資料型では、まず**数字をそのまま読む**。ここで言えるのは「増えた」という事実だけだ。",
        manuscript: {
          lines: [
            {
              text: "【練習用の資料】ある市で自転車通学を選んだ高校生の割合",
              tone: "normal",
            },
            { text: "2015年　32％", tone: "normal" },
            { text: "2020年　41％", tone: "normal" },
            { text: "2025年　55％", tone: "normal" },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "効果が出ている、は**資料に書かれていない**。書かれているのは割合が増えたことだけだ。",
        compare: {
          before:
            "この数値から、自転車通学を勧める取り組みが効果を上げていることが分かる。",
          after:
            "この数値は、自転車通学の割合が十年で二十三ポイント増えたことを示している。増えた理由は資料からは読み取れない。",
          highlight: ["二十三ポイント増えた", "読み取れない"],
          note: "読み取りと解釈を分けた",
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "二つが同時に増えていても、片方が**もう片方の原因とは限らない**。ここは書き分ける。",
        compare: {
          before: "自転車通学が増えたことで、生徒の体力が向上している。",
          after:
            "自転車通学の割合と体力測定の平均値は、同じ時期に上がっている。ただし、どちらが原因かはこの資料では判断できない。",
          highlight: ["同じ時期に上がっている", "どちらが原因か"],
          note: "同時に増えた、を原因と書かない",
        },
      },
      {
        id: "s4",
        visual: "manuscript",
        caption:
          "割合が上がっても、**人数が増えたとは限らない**。どちらの数字かを必ず確かめる。",
        manuscript: {
          lines: [
            {
              text: "割合が増えた → 自転車を選んだ生徒の比率が上がった",
              tone: "normal",
            },
            {
              text: "生徒数が減っていれば → 比率が上がっても人数は減っている",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "資料型は①問いが二つに割れて七段になる。**読み取りと解釈を別の段に置く**のが要点だ。",
        manuscript: {
          lines: [
            { text: "読み取り：資料から言える事実", tone: "normal" },
            { text: "解釈：その事実が何を意味するか", tone: "normal" },
            { text: "②立場：私は〜と考える", tone: "normal" },
            { text: "③理由：なぜなら〜だからである", tone: "normal" },
            { text: "④根拠：実際、〜", tone: "normal" },
            { text: "⑤譲歩と反論：確かに〜。しかし〜", tone: "normal" },
            { text: "⑥結論：したがって〜すべきである", tone: "good" },
          ],
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "資料の数字は**④根拠の材料**になる。読み取った事実を、そのまま理由の裏づけに使う。",
        blocks: {
          filled: ["position", "reason", "evidence", "conclusion"],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s7",
        visual: "compare",
        caption:
          "資料に無い数字を持ち出すと、そこだけ根拠が消える。**示された範囲の中で言い切る**。",
        compare: {
          before:
            "全国でも自転車通学は五割を超えており、この流れは全国的なものである。",
          after:
            "この資料から言えるのは、この市で割合が増えたことだけである。全国の傾向は示されていない。",
          highlight: ["この市で", "示されていない"],
          note: "資料に無いことは書かない",
        },
      },
    ],
    drill: { kind: "redundancy" },
    keyTakeaways: [
      "資料から言える事実と、自分の解釈を分ける",
      "同時に増えたことを原因と書かない",
      "割合か実数かを確かめる",
      "資料に無いことは書かない",
    ],
    exercise: {
      prompt:
        "次の資料から読み取れる事実と、それに対するあなたの解釈を200字以内で書きなさい。資料に書かれていないことを事実として書かないこと。\n\n【練習用の資料】ある市で自転車通学を選んだ高校生の割合は、2015年32％、2020年41％、2025年55％であった。同じ期間に、市内を走る路線バスの本数は約2割減っている。",
      wordLimit: 200,
      minLength: 80,
      focusPoints: ["事実の正確な読み取り", "相関と因果の区別"],
      blockId: "evidence",
    },
  },
  {
    id: "essay-basics-16",
    order: 15,
    level: "実践",
    title: "テーマ型",
    summary: "テーマから自分で論点を立て、600字のフル答案を書く",
    durationMin: 14,
    sections: [
      {
        id: "s1",
        heading: "テーマは問いではない",
        body: "「〜について論じなさい」と書かれているとき、与えられているのはテーマだけです。そのままでは答えようがないので、自分で答えられる問いに切り直してから書き始めます。",
      },
      {
        id: "s2",
        heading: "論点を三つ書き出して一つ選ぶ",
        body: "同じテーマでも、切り口によって書く内容は変わります。思いついた論点を三つ書き出し、④根拠まで書けるものを一つ選びます。",
      },
      {
        id: "s3",
        heading: "型はそのまま使える",
        body: "テーマ型はブロックの名前も並びも基本型のままです。増えるのは①を自分で作る手間だけで、②から先はこれまでと同じ手順で書けます。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "テーマ型の設問には、**答えるべき問いが書かれていない**。このまま書き出すと、何に答えたのか自分でも分からなくなる。",
        manuscript: {
          lines: [
            {
              text: "設問：地域社会における高校生の役割について論じなさい（600字）",
              tone: "normal",
            },
            { text: "地域社会について、思うことを書く。", tone: "bad" },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "テーマを写しただけの①は、まだ何も決めていない。**答えが返せる問いの形まで切る**。",
        compare: {
          before: "地域社会について論じる。地域は大切である。",
          after:
            "本問が問うているのは、高校生が地域の担い手になりうるかである。",
          highlight: [
            "本問が問うているのは",
            "高校生が地域の担い手になりうるか",
          ],
          note: "テーマを、答えられる問いに切った",
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "同じテーマでも、切り口を変えれば別の問いになる。三つ書き出し、**④根拠まで書ける一つ**を選ぶ。",
        manuscript: {
          lines: [
            {
              text: "担い手：高校生は地域の行事を運営する側になれるか",
              tone: "normal",
            },
            {
              text: "居場所：高校生には学校の外にも居場所が要るか",
              tone: "normal",
            },
            {
              text: "世代間：高校生と高齢者が日常的に関わる場は要るか",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "diagram",
        caption:
          "テーマ型の字数配分は**基本型のまま**だ。④根拠が一番太く、ここが薄いと点が伸びない。",
        diagram: {
          unit: "字",
          items: [
            { label: "①問い", value: 120, note: "テーマを問いに切る" },
            { label: "②立場", value: 60 },
            { label: "③理由", value: 160 },
            { label: "④根拠・具体例", value: 240, note: "一番厚く書く" },
            { label: "⑤譲歩と反論", value: 140 },
            { label: "⑥結論", value: 80 },
          ],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s5",
        visual: "compare",
        caption:
          "「多くの」「と言われている」は、誰の話でもない。**自分が見た場面まで下ろす**。",
        compare: {
          before:
            "実際、地域では多くの行事が人手不足で困っていると言われている。",
          after:
            "実際、私の住む地区の夏祭りでは、準備に集まったのが六十代以上の十数名だけで、櫓を組むのに二日かかった。",
          highlight: ["私の住む地区の夏祭り", "六十代以上の十数名"],
          note: "一般論をやめた",
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "テーマ型は**六つの段をそのまま使える**。名前も並びも変わらない。",
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
        id: "s7",
        visual: "diagram",
        caption:
          "課題は600字。**800字の配分を四分の三にすれば**、そのまま使える。",
        diagram: {
          unit: "字",
          items: [
            { label: "①問い", value: 90 },
            { label: "②立場", value: 45 },
            { label: "③理由", value: 120 },
            { label: "④根拠・具体例", value: 180, note: "一番厚く書く" },
            { label: "⑤譲歩と反論", value: 105 },
            { label: "⑥結論", value: 60 },
          ],
        },
      },
    ],
    drill: { kind: "particle" },
    keyTakeaways: [
      "テーマは、答えられる問いに切ってから書き始める",
      "論点を三つ書き出し、根拠まで書ける一つを選ぶ",
      "④根拠に一般論を置かず、自分が見た場面を書く",
    ],
    exercise: {
      prompt:
        "「地域社会における高校生の役割」について、あなたの考えを600字以内で論じなさい。",
      wordLimit: 600,
      minLength: 300,
      focusPoints: ["論点の設定", "型の6ブロックの充足"],
      formId: "theme",
    },
  },
  {
    id: "essay-basics-17",
    order: 16,
    level: "実践",
    title: "課題文型",
    summary: "筆者の主張の要約を①に収め、800字のフル答案を書く",
    durationMin: 15,
    sections: [
      {
        id: "s1",
        heading: "①は要約にあてる",
        body: "課題文型では、①問いの位置に筆者の主張の要約を置きます。自分で問いを立てる必要はなく、筆者が何を言ったかを正確に短く書くことがそのまま①になります。",
      },
      {
        id: "s2",
        heading: "要約に賛否を混ぜない",
        body: "要約の中に「私もそう思う」と入れると、どこまでが筆者の主張なのかが分からなくなります。賛否は②立場で書きます。",
      },
      {
        id: "s3",
        heading: "要約は160字で切り上げる",
        body: "要約は課題文を読めた証明にすぎません。点が付くのは③理由と④根拠なので、要約を長く書くほど自分の論が痩せます。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "課題文型では、**①を自分で作らない**。筆者の主張の要約がそこに入る。",
        manuscript: {
          lines: [
            {
              text: "設問：次の文章を読み、筆者の主張を踏まえてあなたの考えを述べなさい（800字）",
              tone: "normal",
            },
            {
              text: "①の位置に、筆者の主張の要約を置く。",
              tone: "good",
              blockId: "question",
            },
          ],
        },
        highlightBlock: "question",
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "要約に賛否を混ぜると、どこまでが筆者の主張なのか分からなくなる。**①は筆者の分だけで書く**。",
        compare: {
          before:
            "筆者は図書館の静けさを守るべきだと述べているが、私も静かな場所は必要だと思う。",
          after:
            "筆者は、にぎわいと引き換えに静けさが削られるなら、図書館は本来の役割を手放すことになると述べている。",
          highlight: ["にぎわいと引き換えに", "本来の役割を手放す"],
          note: "自分の考えを外した",
        },
      },
      {
        id: "s3",
        visual: "diagram",
        caption:
          "①が160字に増える分、③理由と④根拠が少し痩せる。それでも**④根拠が一番太い**ことは変わらない。",
        diagram: {
          unit: "字",
          items: [
            {
              label: "①筆者の主張の要約",
              value: 160,
              note: "自分の意見は入れない",
            },
            { label: "②立場", value: 60, note: "賛成か反対かを言い切る" },
            { label: "③理由", value: 140 },
            { label: "④根拠・具体例", value: 220 },
            { label: "⑤譲歩と反論", value: 140 },
            { label: "⑥結論", value: 80 },
          ],
        },
        highlightBlock: "question",
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "要約は課題文を読めた証明にすぎない。点が付くのは**③④の自分の論**のほうだ。",
        compare: {
          before: "要約に400字を使い、残りで立場と理由を書いた。",
          after: "要約は160字で切り上げ、残る640字を自分の論に使った。",
          highlight: ["160字で切り上げ", "640字を自分の論に"],
          note: "要約は①の中に収める",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "課題文を写した部分は、自分が書いた**字数として読まれない**。引用は「筆者は〜と述べる」の形で短く挟む。",
        manuscript: {
          lines: [
            { text: "課題文の一段落をそのまま書き写す。", tone: "bad" },
            {
              text: "筆者は〜と述べる。この点について、私は〜と考える。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "**課題文型で変わるのは①だけ**だ。②から先は、これまでと同じ順番で書ける。",
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
        highlightBlock: "question",
      },
    ],
    drill: { kind: "subject_predicate" },
    keyTakeaways: [
      "①には筆者の主張の要約を置く",
      "要約に自分の賛否を混ぜない",
      "要約は160字で切り上げ、残りを自分の論に使う",
    ],
    exercise: {
      prompt:
        "次の文章を読み、筆者の主張を踏まえたうえで、あなたの考えを800字以内で述べなさい。",
      wordLimit: 800,
      minLength: 400,
      focusPoints: ["筆者の主張の正確な把握", "要約と自論の分離"],
      formId: "passage",
      sourceText:
        "近年、地域の図書館は、本を借りる場所から人が集まる場所へと役割を変えつつある。館内にカフェを置き、話をしながら過ごせる区画を設け、催しを開く館も増えた。利用者の数だけを見れば、この変化はうまくいっているように見える。しかし、図書館が担ってきたのは、静かに一人で考える時間を誰にでも保障することだったはずである。家にも学校にも一人になれる場所がない者にとって、図書館の静けさは代わりのきかないものであった。にぎわいと引き換えにその静けさが削られているのなら、図書館は本来の役割を手放したことになる。地域の図書館は、まず静かに読める場所であり続けるべきである。",
    },
  },
  {
    id: "essay-basics-18",
    order: 17,
    level: "実践",
    title: "資料型",
    summary: "読み取りと解釈を分け、七つの段で800字のフル答案を書く",
    durationMin: 15,
    sections: [
      {
        id: "s1",
        heading: "資料型だけ段が七つになる",
        body: "①問いが「読み取り（事実）」に置き換わり、②立場の前に「解釈」の段が入ります。並びは基本型のままなので、増えるのは一段だけです。",
      },
      {
        id: "s2",
        heading: "読み取りと解釈を混ぜない",
        body: "読み取りは資料に書いてあること、解釈はそこから言えることです。一つの段に混ぜると、どこまでが資料の話なのかが読み手に伝わりません。",
      },
      {
        id: "s3",
        heading: "同時に増えたことを原因と書かない",
        body: "二つの数字が同じ時期に動いていても、片方がもう片方の原因とは限りません。資料が示しているのは時期であって、順番ではありません。",
      },
      {
        id: "s4",
        heading: "割合か実数かを確かめる",
        body: "母数が動いていれば、割合と実数は別の動き方をします。どちらの数字を見ているのかを確かめてから言い切ります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "diagram",
        caption:
          "**資料型だけ段が七つになる**。①が「読み取り」に変わり、②の前に「解釈」が入る。",
        diagram: {
          unit: "字",
          items: [
            {
              label: "読み取り（事実）",
              value: 160,
              note: "資料に書いてあること",
            },
            { label: "解釈", value: 120, note: "そこから言えること" },
            { label: "②立場", value: 60 },
            { label: "③理由", value: 120 },
            { label: "④根拠・具体例", value: 180 },
            { label: "⑤譲歩と反論", value: 100 },
            { label: "⑥結論", value: 60 },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "この二つを一つの段に混ぜると、どこまでが資料の話なのか伝わらない。**段を分けて書く**。",
        manuscript: {
          lines: [
            {
              text: "読み取り：資料に書いてあることを、そのまま書く",
              tone: "normal",
            },
            {
              text: "解釈：その事実から言えることを、自分の言葉で書く",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s3",
        visual: "compare",
        caption:
          "同じ時期に増えた二つを、**原因と結果でつないでしまう**答案が多い。資料が示しているのは時期だけだ。",
        compare: {
          before:
            "この資料から、閲覧席を増やしたことで図書館に立ち寄る高校生が増えたと分かる。",
          after:
            "閲覧席の増加と、図書館に立ち寄る割合の上昇は、同じ時期に起きている。どちらが原因かは、この資料からは分からない。",
          highlight: ["同じ時期に起きている", "どちらが原因か"],
          note: "相関を因果と書かない",
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "資料に無い数字を足すと、その一文だけ根拠が消える。**示された範囲の中で言い切る**。",
        compare: {
          before:
            "全国でも高校生の図書館利用は四割を超えており、同じ傾向が続いている。",
          after:
            "この資料が示しているのは、この町の調査結果だけである。全国の傾向は示されていない。",
          highlight: ["この町の調査結果だけ", "示されていない"],
          note: "資料に無いことは書かない",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "割合が二倍になっても、人数が二倍とは限らない。**母数が動いていないか**を必ず確かめる。",
        manuscript: {
          lines: [
            {
              text: "図書館に立ち寄る割合は、十年で十八％から三十九％に増えた。",
              tone: "normal",
            },
            {
              text: "同じ期間に高校生の数が一割減っているので、人数の増え方は割合ほどではない。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "変わるのは①の中身と、②の前に一段増えることだけだ。**③から先はこれまで通り**に書ける。",
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
        highlightBlock: "question",
      },
    ],
    drill: { kind: "sentence_length" },
    keyTakeaways: [
      "読み取り（事実）と解釈（言えること）を段で分ける",
      "同じ時期に増えたことを、原因と結果として書かない",
      "割合か実数かを確かめてから言い切る",
    ],
    exercise: {
      prompt:
        "次の資料から読み取れることを踏まえ、あなたの考えを800字以内で述べなさい。",
      wordLimit: 800,
      minLength: 400,
      focusPoints: ["事実の正確な読み取り", "相関と因果の区別"],
      formId: "data",
      chartDataSummary:
        "【練習用の資料】ある町で高校生に「放課後に立ち寄る場所」をたずねた調査の結果。\n図書館：2015年18％／2020年27％／2025年39％\n商業施設：2015年44％／2020年38％／2025年25％\nまた、同じ期間にこの町の高校生の数は約1割減り、町立図書館の閲覧席は40席から90席に増えている。",
    },
  },
  {
    id: "essay-basics-19",
    order: 18,
    level: "実践",
    title: "解決策提示型",
    summary: "原因に対応した解決策を出し、実現可能性まで書く",
    durationMin: 15,
    sections: [
      {
        id: "s1",
        heading: "③と④と⑤の名前が変わる",
        body: "③理由が「原因」に、④根拠が「解決策と実現可能性」に、⑤譲歩と反論が「副作用とコスト」に置き換わります。並びは基本型のままです。",
      },
      {
        id: "s2",
        heading: "解決策は原因の真上に置く",
        body: "自分が書いた原因に対応していない打ち手は、内容が良くても評価されません。原因と解決策を並べて、対応しているかを確かめます。",
      },
      {
        id: "s3",
        heading: "実現可能性に触れる",
        body: "誰がやるのか、費用はどこから出るのか。この二つに触れると、思いつきが提案に変わります。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "diagram",
        caption:
          "解決策提示型は**③④⑤の名前が変わり**、②の後に「現状」が一段入る。並びは今まで通りだ。",
        diagram: {
          unit: "字",
          items: [
            { label: "①問い", value: 120 },
            { label: "②立場", value: 60 },
            { label: "現状", value: 80, note: "いま何が起きているか" },
            { label: "③原因", value: 160, note: "なぜそうなったか" },
            {
              label: "④解決策と実現可能性",
              value: 220,
              note: "誰がいくらでやるか",
            },
            { label: "⑤副作用とコスト", value: 100 },
            { label: "⑥結論", value: 60 },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "本数を増やすべきだ、では誰も動けない。**いつ・何を・どう変えるか**まで書く。",
        compare: {
          before: "バスの本数を増やすべきだ。",
          after:
            "利用者が少ない時間帯を乗合タクシーに切り替え、朝夕の便を路線バスとして残すべきだ。",
          highlight: ["利用者が少ない時間帯", "乗合タクシーに切り替え"],
          note: "打ち手を、実行できる大きさにした",
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "解決策は、**自分が書いた原因の真上に置く**。原因と無関係な打ち手は、良い案でも点にならない。",
        manuscript: {
          lines: [
            {
              text: "原因は運転手の不足である。だから運賃を下げるべきだ。",
              tone: "bad",
            },
            {
              text: "原因は運転手の不足である。だから勤務時間を短くし、担い手を増やすべきだ。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "誰がやるのか、**費用はどこから出るのか**。この二つに触れると、思いつきが提案に変わる。",
        compare: {
          before: "町が新しい交通の仕組みを導入すればよい。",
          after:
            "既存の福祉車両を空き時間に使えば、車両を買わずに済む。運行は地元のタクシー会社に委託する。",
          highlight: [
            "既存の福祉車両",
            "車両を買わずに済む",
            "地元のタクシー会社に委託",
          ],
          note: "誰がいくらで、を書いた",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "自分の案の**弱いところを自分で書く**。ここに触れた答案のほうが高く評価される。",
        manuscript: {
          lines: [
            {
              text: "確かに、乗合タクシーは時刻が決まっておらず、通院の予約には使いにくい。",
              tone: "normal",
            },
            {
              text: "しかし、朝夕の便を路線バスとして残せば、この不便は避けられる。",
              tone: "good",
            },
          ],
        },
        highlightBlock: "concession",
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "③理由は「原因」、④根拠は「解決策と実現可能性」に置き換わる。中身が変わるだけで、**置く場所は同じ**だ。",
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
        highlightBlock: "evidence",
      },
    ],
    drill: { kind: "redundancy" },
    keyTakeaways: [
      "解決策は、自分が書いた原因に対応させる",
      "誰がやるのか、費用はどこから出るのかまで書く",
      "⑤で自分の案の副作用とコストに触れる",
    ],
    exercise: {
      prompt:
        "地域の公共交通の維持について、課題と解決策を800字以内で述べなさい。",
      wordLimit: 800,
      minLength: 400,
      focusPoints: ["原因と解決策の対応", "実現可能性への言及"],
      formId: "solution",
    },
  },
  {
    id: "essay-basics-08",
    order: 19,
    level: "実践",
    title: "推敲と減点潰し",
    summary: "見直しの順序を決め、表記で落とす点を潰す",
    durationMin: 12,
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
    scenes: [
      {
        id: "s1",
        visual: "manuscript",
        caption:
          "見直しは**上から順に行う**。表記から直し始めると、設問ずれに気づかないまま提出することになる。",
        manuscript: {
          lines: [
            { text: "見直し1：設問に答えているか", tone: "normal" },
            { text: "見直し2：六つの段がそろっているか", tone: "normal" },
            { text: "見直し3：一文が長すぎないか", tone: "normal" },
            { text: "見直し4：誤字と表記がそろっているか", tone: "normal" },
          ],
        },
      },
      {
        id: "s2",
        visual: "compare",
        caption:
          "**話し言葉と略語**は、内容に関係なく減点される。文末は「である」にそろえる。",
        compare: {
          before:
            "やっぱりスマホは便利だと思うし、使いすぎは良くないかなと思います。",
          after:
            "携帯端末は便利である。しかし、使用時間が長くなれば生活に支障が出る。",
          highlight: ["携帯端末", "使用時間が長くなれば", "支障が出る"],
          note: "文末と表記をそろえた",
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "原稿用紙のルールは、**覚えれば確実に取れる点**だ。ここを落とすのはもったいない。",
        manuscript: {
          lines: [
            { text: "段落の初めは一マス空ける。", tone: "normal" },
            {
              text: "句読点と閉じかっこは行頭に置かず、前の行の最後のマスに入れる。",
              tone: "normal",
            },
            {
              text: "縦書きの数字は漢数字で書く（六時間、二十三パーセント）。",
              tone: "normal",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "「使われてる」「変えれない」は話し言葉だ。書くときは**省略しない形に戻す**。",
        compare: {
          before: "この制度は多くの人に使われてるので、簡単には変えれない。",
          after:
            "この制度は多くの人に利用されているため、容易には変更できない。",
          highlight: ["利用されているため", "容易には変更できない"],
          note: "話し言葉を書き言葉に",
        },
      },
      {
        id: "s5",
        visual: "manuscript",
        caption:
          "感嘆符と略語は答案では使わない。どれも**書き直せば消える減点**だ。",
        manuscript: {
          lines: [
            { text: "本当にこのままでよいのか！", tone: "bad" },
            { text: "スマホ・部活・コスパをそのまま使う。", tone: "bad" },
            {
              text: "携帯端末・部活動・費用対効果と、正式な言い方に直す。",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s6",
        visual: "blocks",
        caption:
          "六つの段がそろっているかを確かめる。抜けていれば、**表記より先にそこを直す**。",
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
    drill: { kind: "style" },
    keyTakeaways: [
      "見直しは設問→型→一文→表記の順に行う",
      "話し言葉・略語・感嘆符は書き直せば消える減点",
      "段落の一字下げと禁則を守る",
      "提出前に必ず見直す",
    ],
    exercise: {
      prompt:
        "これまでに書いた答案から一つ選び、次の順序で見直して400字以内に書き直しなさい。1．設問に答えているか　2．六つの段がそろっているか　3．一文が長すぎないか　4．誤字と表記がそろっているか。",
      wordLimit: 400,
      minLength: 200,
      focusPoints: ["表記の正確さ", "見直しの網羅"],
      blockId: null,
    },
  },
  {
    id: "essay-basics-20",
    order: 20,
    level: "実践",
    title: "本番の時間配分",
    summary: "60分の使い方を決め、時間内に800字を書き切る",
    durationMin: 12,
    sections: [
      {
        id: "s1",
        heading: "構想20分・執筆30分・見直し10分",
        body: "60分の試験で書く時間は半分しかありません。構想に20分使うほうが、結局は速く書き終わります。",
      },
      {
        id: "s2",
        heading: "構想で六つの段にメモを置く",
        body: "設問の条件を書き出し、論点を三つ書いて一つ選び、六つの段に一言ずつメモします。ここまで済めば、あとは書くだけになります。",
      },
      {
        id: "s3",
        heading: "削る順番を先に決めておく",
        body: "書き切れないときは⑤譲歩と反論を一文に縮め、②立場と⑥結論を必ず残します。迷っている時間そのものが一番の損です。",
      },
    ],
    scenes: [
      {
        id: "s1",
        visual: "diagram",
        caption:
          "60分の試験で書く時間は半分しかない。**構想に20分使う**ほうが、結局は速く書き終わる。",
        diagram: {
          unit: "分",
          items: [
            { label: "構想", value: 20, note: "設問分析と論点決め" },
            { label: "執筆", value: 30, note: "手を止めずに書く" },
            { label: "見直し", value: 10, note: "設問→型→一文→表記" },
          ],
        },
      },
      {
        id: "s2",
        visual: "manuscript",
        caption:
          "構想の20分はこの三つに割る。ここで**段が埋まっていれば**、あとは書くだけになる。",
        manuscript: {
          lines: [
            { text: "5分：設問を読み、条件を書き出す", tone: "normal" },
            { text: "5分：論点を三つ書き、一つ選ぶ", tone: "normal" },
            { text: "10分：六つの段に一言ずつメモする", tone: "normal" },
          ],
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "**メモは文にしない**。単語で置くだけで、書き始めてから構成に迷わなくなる。",
        manuscript: {
          lines: [
            {
              text: "①問い：高校生は地域の担い手になれるか　②立場：なれる",
              tone: "normal",
            },
            { text: "③理由：担い手の高齢化で行事が続かない", tone: "normal" },
            {
              text: "④根拠：夏祭りの準備に集まったのは六十代以上の十数名",
              tone: "normal",
            },
            {
              text: "⑤確かに学業との両立　しかし行事は年数回　⑥運営を任せるべきだ",
              tone: "good",
            },
          ],
        },
      },
      {
        id: "s4",
        visual: "compare",
        caption:
          "書き切れないと分かったら、⑤を一文に削って⑥を書く。**結論の無い答案は大きく落ちる**。",
        compare: {
          before: "確かに学業との両立は難しく、負担が増えるという心配もあり、",
          after:
            "確かに学業との両立は難しい。したがって、負担の少ない行事から高校生に運営を任せるべきである。",
          highlight: ["したがって", "運営を任せるべきである"],
          note: "結論を先に確保した",
        },
      },
      {
        id: "s5",
        visual: "diagram",
        caption:
          "字数もあらかじめ決めておく。書きながら配分を考えると、**⑥の分が残らない**。",
        diagram: {
          unit: "字",
          items: [
            { label: "①問い", value: 120 },
            { label: "②立場", value: 60 },
            { label: "③理由", value: 160 },
            { label: "④根拠・具体例", value: 240 },
            { label: "⑤譲歩と反論", value: 140 },
            { label: "⑥結論", value: 80 },
          ],
        },
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "**削る順番は書く前に決めておく**。迷っている時間そのものが一番の損だ。",
        manuscript: {
          lines: [
            {
              text: "必ず残す：②立場と⑥結論。無いと問いに答えていない答案になる",
              tone: "good",
            },
            {
              text: "次に守る：③理由と④根拠。ここが薄いと点が伸びない",
              tone: "normal",
            },
            {
              text: "先に削る：⑤譲歩と反論。一文に縮めても成立する",
              tone: "normal",
            },
          ],
        },
      },
    ],
    keyTakeaways: [
      "60分は構想20分・執筆30分・見直し10分に割る",
      "構想のうちに六つの段へ一言ずつメモを置く",
      "書き切れないときは⑤から削り、②と⑥を残す",
    ],
    exercise: {
      prompt:
        "「これからの社会で求められる学び方」について、60分で800字以内の答案を書きなさい。",
      wordLimit: 800,
      minLength: 400,
      focusPoints: ["時間内での完成", "型の6ブロックの充足"],
      formId: "theme",
      timeLimitMin: 60,
    },
  },
];
