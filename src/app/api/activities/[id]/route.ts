import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import type { Activity } from "@/lib/types/activity";

const MOCK_ACTIVITIES: Record<string, Activity> = {
  "activity-1": {
    id: "activity-1",
    userId: "student-1",
    title: "文芸部部長として活動",
    category: "club",
    period: { start: "2024-04", end: "2026-03" },
    description: "高校2年から文芸部の部長を務め、部員20名をまとめて文化祭での作品展示や校内文芸誌の発行を主導した。",
    structuredData: {
      motivation: "中学時代から創作が好きで、高校では仲間と一緒に活動の場を広げたいと思った。",
      actions: [
        "部長として月2回の定例会議を運営",
        "文化祭で校外の作家を招いたトークイベントを企画・実施",
        "校内文芸誌を年2回発行（編集長として全体の構成を担当）",
      ],
      results: [
        "文化祭のトークイベントに来場者150名を動員",
        "文芸誌の発行部数を前年比2倍（200部→400部）に拡大",
        "部員数が12名から20名に増加",
      ],
      learnings: [
        "チームをまとめるには一人ひとりの強みを活かす配置が重要",
        "外部との連携で活動の質が大きく向上する",
      ],
      connection: "大学では日本文学を専攻し、創作と批評の両面から文学の可能性を探求したい。部活動で培ったリーダーシップをゼミ活動でも活かしたい。",
    },
    optimizations: [
      {
        universityId: "kyoto-u",
        facultyId: "letters",
        universityName: "京都大学",
        facultyName: "文学部",
        optimizedText: "高校文芸部の部長として、組織運営と創作活動の両立に取り組みました。特に、文化祭での外部作家招聘トークイベント（来場者150名）や文芸誌の発行部数倍増（200→400部）など、主体的に企画・実行する力を磨きました。この経験から、多様な視点を統合して新しい価値を生み出すプロセスに強い関心を持ち、貴学文学部で日本近代文学の研究を通じてその力をさらに深めたいと考えています。",
        alignmentScore: 8,
        keyApKeywords: ["主体的", "多様な視点", "探求心"],
        generatedAt: "2026-03-15T10:00:00",
      },
    ],
    createdAt: "2026-03-10T10:00:00",
    updatedAt: "2026-03-15T10:00:00",
  },
  "activity-2": {
    id: "activity-2",
    userId: "student-1",
    title: "地域清掃ボランティア",
    category: "volunteer",
    period: { start: "2024-06", end: "2025-12" },
    description: "月1回の地域清掃ボランティアに参加し、後半はリーダーとして新規参加者の取りまとめを担当した。",
    structuredData: {
      motivation: "通学路のゴミが気になり、自分にできることから始めたいと思った。",
      actions: [
        "毎月第2土曜日の清掃活動に1年半継続参加",
        "SNSで活動を発信し新規参加者を募集",
        "清掃ルートの最適化を提案し実施",
      ],
      results: [
        "新規参加者を累計30名獲得",
        "清掃エリアを2区画から5区画に拡大",
      ],
      learnings: [
        "継続することの大切さと、小さな行動が地域に与える影響の大きさ",
        "SNSを活用した広報・マーケティングのスキル",
      ],
      connection: "地域課題の解決に関心があり、大学では社会学的なアプローチで地域コミュニティの活性化を研究したい。",
    },
    optimizations: [],
    createdAt: "2026-03-12T10:00:00",
    updatedAt: "2026-03-12T10:00:00",
  },
  "activity-3": {
    id: "activity-3",
    userId: "student-1",
    title: "プログラミングコンテスト入賞",
    category: "competition",
    period: { start: "2025-07", end: "2025-08" },
    description: "高校生向けプログラミングコンテストに出場し、防災アプリを開発して優秀賞を受賞した。",
    optimizations: [],
    createdAt: "2026-03-14T10:00:00",
    updatedAt: "2026-03-14T10:00:00",
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(_request, "activityManager");
    if (gate) return gate;

    const { id } = await params;
    const activity = MOCK_ACTIVITIES[id];
    if (!activity) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ activity });
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "活動実績の取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "activityManager");
    if (gate) return gate;

    const { id } = await params;
    const activity = MOCK_ACTIVITIES[id];
    if (!activity) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const updated: Activity = {
      ...activity,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ activity: updated });
  } catch (error) {
    console.error("Activity PUT error:", error);
    return NextResponse.json({ error: "活動実績の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(_request, "activityManager");
    if (gate) return gate;

    const { id } = await params;
    const activity = MOCK_ACTIVITIES[id];
    if (!activity) {
      return NextResponse.json({ error: "活動実績が見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity DELETE error:", error);
    return NextResponse.json({ error: "活動実績の削除に失敗しました" }, { status: 500 });
  }
}
