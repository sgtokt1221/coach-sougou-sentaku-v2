import type { EssayLecture } from "./types";

/**
 * 小論文の基礎を学ぶ講座。講義アニメ → 文のドリル → 型のブロック課題 → AI添削。
 *
 * 1〜8講は「型を組む」まで一本の問い（スマートフォンの使用時間の制限）を通して進み、
 * 3〜7講で書いたブロックを8講で1本の答案につなぐ。
 * 9〜11講は「中身の質」で、悪い文と直した文の対比（compare）を主役にする。
 * 12講以降は「読む・分析」。15講の推敲は旧テキストのままで、P3 で作り替える。
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
          "根拠のつもりで一般論を書いた例。誰がどう困っているのかが書かれていない。",
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
          "同じ題材でも、数字と出所を置けば根拠になる。「実際、」で始めるのが型だ。",
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
          "自分の経験も根拠になる。ただし「大変だった」で終えず、主張を支える形にする。",
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
          "「社会問題」のような大きな言葉は、それだけでは何も言っていない。誰に何が起きているかまで下ろす。",
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
          "③理由と④根拠はセットで働く。理由だけで止めると、読み手は「本当にそうか」で終わってしまう。",
        blocks: { filled: ["position", "reason", "evidence"] },
        highlightBlock: "evidence",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption:
          "150字で書く。事実か経験を一つだけ選び、数を増やさずに詳しく書く。",
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
          "反対意見にまったく触れない答案。筋は通っているが、一方的に見えてしまう。",
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
          "反対側をいったん認めてから切り返す。これが⑤譲歩と反論の型だ。",
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
          "わざと弱い反論を立てても点にならない。相手の一番強い言い分を自分で書く。",
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
          "「確かに」で終えると、自分の立場まで揺らいで見える。必ず「しかし」で戻す。",
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
          "⑤は譲るためのブロックではない。反論を処理して②立場を強くするために置く。",
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
          "150字なら二文で収まる。「確かに」で一文、「しかし」で一文が目安だ。",
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
          "結論で新しい話を始めた例。触れただけで終わる話題は、書かないほうがよい。",
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
          "②立場をそのまま写さない。本論で足した条件を入れて言い直すと、答案がまとまる。",
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
          "決意表明で終えると、問いに答えないまま閉じることになる。答えで終える。",
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
          "⑤で書きすぎ、⑥が一行で終わった例。書き出す前に結論の80字を取り分けておく。",
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
          "②立場と⑥結論が同じことを言っているか、提出前にこの二つを見比べる。",
        blocks: { filled: ["position", "conclusion"] },
        highlightBlock: "conclusion",
      },
      {
        id: "s6",
        visual: "manuscript",
        caption: "80字で書く。「したがって〜である」で言い切れば十分だ。",
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
          "ここまでで六つの部品がそろった。最後に、これを一本の文章につなぐ。",
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
          "文が並んでいるだけの例。どれが主張で、どれがその理由なのかが読み取れない。",
        manuscript: {
          lines: [
            { text: "私は使用時間の制限が必要だと考える。", tone: "bad" },
            { text: "就寝前の使用は睡眠時間を削る。", tone: "bad" },
            {
              text: "高校生がインターネットを使う時間は一日に六時間近い。",
              tone: "bad",
            },
          ],
        },
      },
      {
        id: "s3",
        visual: "manuscript",
        caption:
          "「なぜなら」「実際」を足すだけで、次に何が来るかが分かるようになる。",
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
          "「そして」の連発は幼く見える。つなぎ方を変えるか、一文にまとめる。",
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
          "段落はブロックの切れ目で変える。一つの段落に言いたいことを二つ入れない。",
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
        visual: "manuscript",
        caption: "400字ならこの配分でつなぐ。これがそのまま答案の骨格になる。",
        manuscript: {
          lines: [
            { text: "②立場50字 ③理由80字 ④根拠120字", tone: "normal" },
            { text: "⑤譲歩と反論100字 ⑥結論50字 ＝400字", tone: "good" },
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
          "原因まで言い切ってしまった例。投票率が低いことは確かめられるが、なぜ低いかは確かめていない。",
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
          "小論文で使う材料は三つに分かれる。混ぜて書くと、どこまでが確かな話なのかが読み手に伝わらない。",
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
          "壊していると書いた時点で、確かめようのない話になる。事実の部分と判断の部分に切り分ける。",
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
          "事実を先に置き、そのあとで自分の判断を書く。順番が逆だと、判断が根拠なしに見える。",
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
          "失敗という言葉は評価であって、事実ではない。何がどうだったのかを先に書く。",
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
          "どちらかに偏った答案は、どちらも点が伸びない。事実で支え、意見で言い切る。",
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
          "④根拠に置くのは事実。②立場と③理由は、その事実をもとにした自分の意見だ。",
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
          "大きな言葉だけで書いた答案。間違いは一つも無いのに、何も言っていない。",
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
          "多様性という言葉は、どの話にも使えてしまう。誰の何の話なのかまで下ろす。",
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
          "取り組むべきだ、では何をするのかが決まらない。中身を一つ決めると論じられる。",
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
          "大きな言葉から段を下りるように降ろしていく。四段目まで来れば200字で書ける。",
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
          "課題は大きい、で止めると次の一文が書けない。何が課題なのかを名指しする。",
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
          "①問いを小さく切れば、②以降は自然に決まる。書けないのは、たいてい問いが大きすぎるときだ。",
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
          "良い経験でした、では何をした人なのか分からない。何が起きて自分がどう動いたかを書く。",
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
          "学びましたで終える書き方は感想文の型だ。経験は主張を支えるために置く。",
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
          "成長できた、は自分の話で終わっている。その経験が何を裏づけるのかまで書く。",
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
          "独自性の配点は5点。珍しい体験を探すのではなく、自分が見たものを書けばよい。",
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
          "責任感が強いと自分で言っても、読み手は確かめられない。行動を書けば伝わる。",
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
          "経験を置くのは④根拠。②立場や⑥結論に混ぜると、主張全体が体験談に見えてしまう。",
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
          "課題文を読んだら、まず主張の一文を探す。この四行で筆者が言いたいのは最後の一文だ。",
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
          "主張は合図の言葉の後ろに置かれやすい。全文を読み直さず、この目印から探す。",
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
          "要約に自分の賛否を混ぜると、筆者の主張が見えなくなる。まず筆者の分だけ書く。",
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
          "課題文の言葉を並べただけでは要約にならない。自分の言葉に置き換えて短くする。",
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
          "課題文型では、①問いの位置に筆者の主張の要約が入る。そのうえで②立場を決める。",
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
          "課題文型で変わるのはこの二つだけだ。③理由から先は、今まで通りに書ける。",
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
          "設問は、書くべきことの一覧表だ。読んだらまず、条件を数えて書き出す。",
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
          "比較して論じよ、なら片方だけでは答えていない。両方に触れてから立場を書く。",
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
          "設問の最後の動詞で答え方が変わる。ここを読み飛ばすと、答案が丸ごとずれる。",
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
          "設問をそのまま写した①は、何も決めていない。何を論じるのかを自分の言葉で確定する。",
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
          "書き終えたら設問に戻り、この三つを見る。内容が良くても条件落ちは減点になる。",
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
          "設問分析は①問いを作る作業だ。ここが決まれば、②以降はぶれない。",
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
          "資料型では、まず数字をそのまま読む。ここで言えるのは「増えた」という事実だけだ。",
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
          "効果が出ている、は資料に書かれていない。書かれているのは割合が増えたことだけだ。",
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
          "二つが同時に増えていても、片方がもう片方の原因とは限らない。ここは書き分ける。",
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
          "割合が上がっても、人数が増えたとは限らない。どちらの数字かを必ず確かめる。",
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
          "資料型は①問いが二つに割れて七段になる。読み取りと解釈を別の段に置くのが要点だ。",
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
          "資料の数字は④根拠の材料になる。読み取った事実を、そのまま理由の裏づけに使う。",
        blocks: {
          filled: ["position", "reason", "evidence", "conclusion"],
        },
        highlightBlock: "evidence",
      },
      {
        id: "s7",
        visual: "compare",
        caption:
          "資料に無い数字を持ち出すと、そこだけ根拠が消える。示された範囲の中で言い切る。",
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
    id: "essay-basics-08",
    order: 15,
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
