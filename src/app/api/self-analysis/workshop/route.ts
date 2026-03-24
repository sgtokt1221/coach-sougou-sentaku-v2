import { NextRequest, NextResponse } from "next/server";
import { buildSelfAnalysisPrompt } from "@/lib/ai/prompts/self-analysis";

interface WorkshopRequest {
  step: number;
  message: string;
  history?: Array<{ role: string; content: string }>;
  previousStepsData?: Record<string, unknown>;
}

const MOCK_QUESTIONS: Record<number, string[]> = {
  1: [
    "まず、あなたが人生で最も大切にしていることは何ですか？普段の生活で「これだけは譲れない」と感じるものを教えてください。",
    "なるほど、素敵ですね。その価値観はいつ頃から意識するようになりましたか？きっかけとなる出来事があれば教えてください。",
    "ありがとうございます。他にも大切にしていることはありますか？3つ目があれば聞かせてください。",
  ],
  2: [
    "周囲の友人や家族から、あなたの長所としてよく言われることは何ですか？",
    "その強みが発揮された具体的なエピソードを教えてください。成功体験や没頭した経験はありますか？",
    "なるほど。それらの強みを組み合わせると、あなたならではのユニークな特徴が見えてきますね。自分でもそう感じますか？",
  ],
  3: [
    "自分の弱みや苦手なことについて、正直に教えてください。どんなことで苦労しますか？",
    "その弱みに直面した具体的な失敗や挫折の経験はありますか？",
    "その経験から何を学び、どのように成長しましたか？",
  ],
  4: [
    "今、最も興味のある学問分野やテーマは何ですか？",
    "なぜその分野に興味を持ったのですか？きっかけを教えてください。",
    "その分野について、自分で調べたり深掘りしたりした経験はありますか？",
  ],
  5: [
    "大学卒業後、5年以内に達成したい目標はありますか？",
    "もっと先、10年後・20年後にはどのような自分になっていたいですか？",
    "社会に対してどのような形で貢献したいと考えていますか？",
  ],
  6: [
    "志望する大学・学部を選んだ理由を教えてください。",
    "その大学のカリキュラムや研究室、教授で特に惹かれるものはありますか？",
    "大学で具体的に何を学び、どのように成長したいですか？",
  ],
  7: [
    "これまでの自己分析を振り返ってみましょう。あなたの価値観・強み・興味・ビジョンには一貫したテーマがありますね。この方向性で合っていますか？",
    "何か修正したい点や付け加えたいことはありますか？",
    "では、これらを統合した「あなたのストーリー」を完成させましょう。",
  ],
};

const MOCK_STEP_DATA: Record<number, Record<string, unknown>> = {
  1: {
    coreValues: ["誠実さ", "挑戦", "共感"],
    valueOrigins: ["ボランティア経験から誠実さの大切さを学んだ", "部活動で挑戦する喜びを知った"],
    priorityOrder: ["誠実さ", "共感", "挑戦"],
  },
  2: {
    strengths: ["傾聴力", "粘り強さ"],
    evidences: ["友人の相談に乗ることが多い", "部活動で3年間努力を続けた"],
    uniqueCombo: "傾聴力と粘り強さでチームの課題を根気強く解決できる",
  },
  3: {
    weaknesses: ["完璧主義", "人前で話すのが苦手"],
    growthStories: ["文化祭でプレゼンに挑戦して克服した"],
    overcomeLessons: ["完璧より行動することの大切さを学んだ"],
  },
  4: {
    fields: ["国際関係学", "環境問題"],
    reasons: ["海外研修で異文化交流の面白さを実感", "地元の環境問題を調べたことがきっかけ"],
    deepDiveTopics: ["SDGsと地域課題の接続", "多文化共生"],
  },
  5: {
    shortTermGoal: "大学で国際関係を学び、留学経験を積む",
    longTermVision: "国際機関で環境問題の解決に貢献する",
    socialContribution: "先進国と途上国をつなぐ架け橋となる",
    whyThisField: "異文化理解と環境保全の両立が重要だと感じたため",
  },
  6: {
    selfStatement: "国際的な課題解決に挑戦し続ける人間です",
    uniqueNarrative: "誠実さと共感力を武器に、異文化体験と環境への関心を統合して社会に貢献したい",
    apConnection: "多様な視点から社会課題を解決する人材の育成というAPに合致",
  },
  7: {
    selfStatement: "私は「誠実さ」と「共感力」を軸に、国際的な課題解決に挑戦し続ける人間です。",
    uniqueNarrative: "ボランティア経験で誠実さを学び、部活動の粘り強い取り組みと海外研修での異文化体験を通じ、国際関係学への関心が芽生えました。環境問題と多文化共生を結びつけ、持続可能な社会づくりに貢献したいと考えています。",
    apConnection: "貴学が掲げる「多様な視点から社会課題を解決する人材の育成」というAPに、私の異文化体験と環境問題への関心が合致します。",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: WorkshopRequest = await request.json();
    const { step, message, history, previousStepsData } = body;

    if (!message || !step) {
      return NextResponse.json(
        { error: "step と message は必須です" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const turnCount = (history?.length ?? 0) + 1;
      const questions = MOCK_QUESTIONS[step] ?? MOCK_QUESTIONS[1];

      if (turnCount >= 6) {
        return NextResponse.json({
          aiQuestion:
            "このステップのヒアリングが完了しました。内容を整理しましたので確認してください。",
          isComplete: true,
          stepData: MOCK_STEP_DATA[step] ?? MOCK_STEP_DATA[1],
        });
      }

      const questionIndex = Math.min(
        Math.floor(turnCount / 2),
        questions.length - 1
      );
      return NextResponse.json({
        aiQuestion: questions[questionIndex],
        isComplete: false,
      });
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const systemPrompt = buildSelfAnalysisPrompt(step, previousStepsData);
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          aiQuestion: parsed.aiQuestion ?? text,
          isComplete: parsed.isComplete ?? false,
          stepData: parsed.stepData,
        });
      }
    } catch {
      // JSON parse failed, return raw text
    }

    return NextResponse.json({
      aiQuestion: text,
      isComplete: false,
    });
  } catch (error) {
    console.error("Self-analysis workshop error:", error);
    return NextResponse.json(
      { error: "ワークショップ処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
