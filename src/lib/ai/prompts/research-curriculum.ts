/**
 * 自己探究授業のカリキュラム導線プロンプト。
 * (1) 分野決め対話 (2) カリキュラム生成。いずれも JSON のみを返させる。
 * 生徒の自己分析・MBTI・活動実績(=ResearchSelfContext.text)を文脈として渡す。
 */

/** 分野決め対話の応答 */
export interface CurriculumChatResult {
  aiMessage: string;
  suggestedDomains?: string[];
  isReady: boolean;
  decided?: { domain: string; theme: string; goal: string };
}

/** 生成された各ユニット（保存前の素データ） */
export interface GeneratedUnit {
  title: string;
  aim: string;
  research: string[];
  output: string;
}

export function buildCurriculumChatPrompt(selfContext: string): string {
  return `あなたは高校1・2年生の「自己探究授業」で、生徒が探究する分野とテーマを一緒に決めるAIメンターです。
生徒が「これを深めたい」と思える分野・テーマ・ゴール(問い)を、対話で引き出してください。

${selfContext ? `生徒の自己理解(自己分析・MBTI・活動実績より):\n${selfContext}\n` : "（自己分析データはまだありません。興味や最近気になったことから優しく聞き出してください。）\n"}

進め方:
- 1回の発話で質問は1つまで。中高生に伝わる平易な言葉で、励ましながら。
- 上の自己理解があれば、それを踏まえて分野の候補を2〜4個 suggestedDomains として提案してよい。
- 興味・テーマ・ゴール(問い)が十分に定まったら isReady=true にし、decided に {domain, theme, goal} を入れる。
- まだ定まらない間は isReady=false。

出力は次のJSONのみ。前後に文章を付けない。日本語。
{
  "aiMessage": "生徒への次の一言（質問や提案）",
  "suggestedDomains": ["候補1", "候補2"],
  "isReady": false,
  "decided": null
}
isReady=true のときは "decided": { "domain": "...", "theme": "...", "goal": "..." } を必ず入れる。`;
}

export function buildCurriculumGeneratePrompt(args: {
  domain: string;
  theme: string;
  goal: string;
  unitCount: number;
  selfContext: string;
}): string {
  const { domain, theme, goal, unitCount, selfContext } = args;
  return `あなたは高校1・2年生の「自己探究授業」のカリキュラム設計者です。
各回で「生徒が講師に教える(プロテジェ効果)」前提の、連続した探究カリキュラムを作ります。

分野: ${domain}
探究テーマ: ${theme}
ゴール／問い: ${goal}
全${unitCount}回。
${selfContext ? `生徒の自己理解:\n${selfContext}\n` : ""}

設計方針:
- 第1回は入口(全体像・問いの設定)、後半に向けて深掘り→検証→まとめ(発表)へと段階的に。
- 各回は「生徒が調べて、講師に教える」ことを前提に、調べること(research)と、教えるアウトプット(output)を具体的に。
- 中高生が実際に取り組める粒度。出典は公式・一次情報を意識させる。

出力は次のJSONのみ。前後に文章を付けない。日本語。units は必ず${unitCount}個。
{
  "units": [
    { "title": "第1回のテーマ", "aim": "狙い", "research": ["調べること1", "調べること2"], "output": "教えるアウトプット" }
  ]
}`;
}

export function buildMockCurriculumChat(message: string): CurriculumChatResult {
  // 「決定」などのキーワードで ready になる簡易モック
  if (/(決定|これで|ok|オーケー|お願い)/i.test(message)) {
    return {
      aiMessage: "いいですね。その方向でカリキュラムを作ってみましょう。",
      isReady: true,
      decided: {
        domain: "地域社会",
        theme: "地方商店街の再生",
        goal: "なぜ商店街は衰退し、どうすれば人が戻るのか？",
      },
    };
  }
  return {
    aiMessage:
      "（モック）最近「これは面白い」と感じたことはありますか？身近な街・スポーツ・ゲーム・自然など何でもいいですよ。",
    suggestedDomains: ["地域社会", "環境・サステナビリティ", "テクノロジー"],
    isReady: false,
  };
}

export function buildMockCurriculumUnits(unitCount: number, theme: string): GeneratedUnit[] {
  return Array.from({ length: unitCount }, (_, i) => ({
    title: `第${i + 1}回: ${theme} を${i === 0 ? "つかむ" : i === unitCount - 1 ? "まとめて発表" : "深める"}`,
    aim: `${theme}について${i + 1}段階目の理解を得る`,
    research: ["関連する一次情報・公式データを調べる", "前回からの疑問を1つ深掘りする"],
    output: "調べたことを3分で講師に説明する",
  }));
}
