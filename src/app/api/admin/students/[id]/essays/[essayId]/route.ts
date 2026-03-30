import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Essay } from "@/lib/types/essay";

const MOCK_ESSAY: Essay = {
  id: "essay_mock_001",
  userId: "mock_student_001",
  imageUrl: "",
  ocrText:
    "現代社会において、AIの発展は私たちの生活に大きな影響を与えています。特に教育分野では、個別最適化された学習体験の提供が可能になりつつあります。\n\n私は、AIを活用した教育の可能性について、三つの観点から論じたいと思います。\n\n第一に、AIによる学習データの分析により、生徒一人ひとりの理解度や学習スタイルに合わせた指導が可能になります。従来の一斉授業では対応しきれなかった個別のニーズに応えることができるのです。\n\n第二に、AIチューターの導入により、時間や場所を問わない学習支援が実現します。これにより、地方と都市部の教育格差の解消にも寄与することが期待されます。\n\n第三に、教員の業務負担軽減という側面があります。採点や事務作業をAIが担うことで、教員は生徒との対話や創造的な指導に注力できるようになります。\n\nしかし、AIに依存しすぎることへの懸念も忘れてはなりません。人間同士のコミュニケーションや感情教育は、AIでは代替できない領域です。\n\n以上のことから、AIと人間の教育者が協調する形が、今後の教育の理想的な姿であると考えます。",
  targetUniversity: "東京大学",
  targetFaculty: "教育学部",
  topic: "AIと教育の未来について",
  submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  status: "reviewed",
  scores: {
    structure: 8,
    logic: 7,
    expression: 7,
    apAlignment: 6,
    originality: 7,
    total: 35,
  },
  feedback: {
    overall:
      "全体的によくまとまった小論文です。三つの観点から論じる構成は明確で読みやすいです。ただし、AP（アドミッション・ポリシー）との関連性をもう少し意識した議論展開が望まれます。",
    goodPoints: [
      "三つの観点による明確な構成",
      "AIのメリットだけでなくデメリットにも言及している点",
      "結論で協調という建設的な提案ができている点",
    ],
    improvements: [
      "具体的なデータや事例を挙げることで説得力が増します",
      "「教育格差の解消」について、より具体的にどのように解消されるのか掘り下げると良いでしょう",
      "東京大学教育学部のAPに沿った自身の研究関心との接続があるとさらに良くなります",
    ],
    repeatedIssues: [
      {
        area: "具体性",
        count: 3,
        message: "抽象的な議論が多く、具体例が不足しています",
      },
    ],
    improvementsSinceLast: [
      {
        area: "構成",
        before: "段落の区切りが不明確",
        after: "三段構成で明確に分かれている",
        message: "構成力が大きく向上しています",
      },
    ],
    brushedUpText:
      "現代社会において、AIの発展は教育を根本から変革する可能性を秘めています。文部科学省の「GIGAスクール構想」が示すように、テクノロジーと教育の融合は国家レベルの課題となっています。\n\n私は、AIを活用した教育の可能性について、三つの観点から論じます。\n\n第一に、学習の個別最適化です。スタンフォード大学の研究（2023）によると、AI搭載の適応学習システムを利用した生徒は、従来型の学習と比較して理解度が23%向上したという結果が出ています。\n\n第二に、教育アクセスの平等化です。例えば、離島や過疎地域の生徒が、都市部と同等の質の高い個別指導を受けられるようになります。\n\n第三に、教員の専門性強化です。採点業務の自動化により、教員は生徒の情意面の発達支援や、探究学習のファシリテーションに注力できます。\n\n一方で、AIへの過度な依存は、批判的思考力や対人コミュニケーション能力の発達を阻害する恐れがあります。\n\n東京大学教育学部のAPが掲げる「教育の本質を問い続ける姿勢」を踏まえ、AI時代においても人間性を軸とした教育の在り方を探究していきたいと考えます。",
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; essayId: string }> }
) {
  const auth = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (auth instanceof NextResponse) return auth;

  const { id: studentId, essayId } = await params;

  if (!adminDb) {
    // dev mode mock
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ...MOCK_ESSAY,
        id: essayId,
        userId: studentId,
      });
    }
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  try {
    const essayDoc = await adminDb.doc(`essays/${essayId}`).get();

    if (!essayDoc.exists) {
      return NextResponse.json(
        { error: "エッセイが見つかりません" },
        { status: 404 }
      );
    }

    const data = essayDoc.data()!;

    // userId が対象生徒と一致することを確認
    if (data.userId !== studentId) {
      return NextResponse.json(
        { error: "この生徒のエッセイではありません" },
        { status: 403 }
      );
    }

    const essay: Essay = {
      id: essayDoc.id,
      userId: data.userId,
      imageUrl: data.imageUrl || "",
      ocrText: data.ocrText || "",
      targetUniversity: data.targetUniversity || "",
      targetFaculty: data.targetFaculty || "",
      topic: data.topic,
      submittedAt: data.submittedAt?.toDate() || new Date(),
      status: data.status || "uploaded",
      scores: data.scores || undefined,
      feedback: data.feedback || undefined,
    };

    return NextResponse.json(essay);
  } catch (error) {
    console.error("Failed to fetch essay:", error);
    return NextResponse.json(
      { error: "エッセイの取得に失敗しました" },
      { status: 500 }
    );
  }
}
