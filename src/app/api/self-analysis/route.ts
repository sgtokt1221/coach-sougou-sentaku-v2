import { NextRequest, NextResponse } from "next/server";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

const MOCK_SELF_ANALYSIS: SelfAnalysis = {
  id: "sa-mock-1",
  userId: "user-mock-1",
  values: {
    coreValues: ["誠実さ", "挑戦", "共感"],
    valueOrigins: [
      "小学校でのボランティア経験から誠実さの大切さを学んだ",
      "部活動で新しいことに挑戦する喜びを知った",
    ],
    priorityOrder: ["誠実さ", "共感", "挑戦"],
  },
  strengths: {
    strengths: ["傾聴力", "粘り強さ"],
    evidences: [
      "友人の相談に乗ることが多く、周囲から信頼されている",
      "部活動で3年間努力を続け、県大会出場を果たした",
    ],
    uniqueCombo: "傾聴力と粘り強さを掛け合わせ、チームの課題を根気強く解決できる",
  },
  weaknesses: {
    weaknesses: ["完璧主義", "人前で話すのが苦手"],
    growthStories: [
      "文化祭の実行委員でプレゼンに挑戦し、少しずつ克服した",
    ],
    overcomeLessons: [
      "完璧を目指すより、まず行動することの大切さを学んだ",
    ],
  },
  interests: {
    fields: ["国際関係学", "環境問題"],
    reasons: [
      "海外研修で異文化交流の面白さを実感した",
      "地元の環境問題について調べたことがきっかけ",
    ],
    deepDiveTopics: ["SDGsと地域課題の接続", "多文化共生"],
  },
  vision: {
    shortTermGoal: "大学で国際関係を学び、留学経験を積む",
    longTermVision: "国際機関で環境問題の解決に貢献する",
    socialContribution: "先進国と途上国をつなぐ架け橋となる",
    whyThisField: "自分の経験から、異文化理解と環境保全の両立が重要だと感じたため",
  },
  identity: {
    selfStatement:
      "私は「誠実さ」と「共感力」を軸に、国際的な課題解決に挑戦し続ける人間です。",
    uniqueNarrative:
      "小学校のボランティア経験で「誠実に人と向き合うこと」の大切さを学びました。高校では部活動の粘り強い取り組みと海外研修での異文化体験を通じ、国際関係学への関心が芽生えました。環境問題と多文化共生を結びつけ、持続可能な社会づくりに貢献したいと考えています。",
    apConnection:
      "貴学の国際学部が掲げる「多様な視点から社会課題を解決する人材の育成」というAPに、私の異文化体験と環境問題への関心が合致します。",
  },
  completedSteps: 7,
  isComplete: true,
  chatHistory: [],
  createdAt: "2026-03-20T00:00:00Z",
  updatedAt: "2026-03-20T00:00:00Z",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    // Dev mode: return mock data
    return NextResponse.json(MOCK_SELF_ANALYSIS);
  } catch (error) {
    console.error("Self-analysis GET error:", error);
    return NextResponse.json(
      { error: "自己分析データの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId は必須です" },
        { status: 400 }
      );
    }

    // Dev mode: return success
    return NextResponse.json({
      success: true,
      id: body.id ?? `sa-${Date.now()}`,
    });
  } catch (error) {
    console.error("Self-analysis POST error:", error);
    return NextResponse.json(
      { error: "自己分析データの保存に失敗しました" },
      { status: 500 }
    );
  }
}
