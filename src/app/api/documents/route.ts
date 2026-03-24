import { NextRequest, NextResponse } from "next/server";
import type { Document, DocumentCreateRequest } from "@/lib/types/document";

const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-001",
    userId: "mock_user_001",
    type: "志望理由書",
    universityId: "kyoto-u",
    facultyId: "letters",
    universityName: "京都大学",
    facultyName: "文学部",
    title: "京都大学文学部 志望理由書",
    content: "私が京都大学文学部を志望する理由は、人文学の幅広い学びを通じて、現代社会が抱える文化的課題に取り組みたいと考えるからです。\n\n高校時代、地域の伝統文化保存活動に参加し、文化遺産の価値と継承の困難さを実感しました。この経験から、文化を学問的に研究し、その意義を社会に発信する力を身につけたいと思うようになりました。\n\n貴学の自由な学風と、分野横断的な研究環境は、私の探究心を最大限に活かせる場であると確信しています。",
    wordCount: 198,
    targetWordCount: 800,
    versions: [
      {
        id: "v1",
        content: "私が京都大学文学部を志望する理由は...",
        wordCount: 120,
        createdAt: "2026-03-10T10:00:00Z",
      },
      {
        id: "v2",
        content: "私が京都大学文学部を志望する理由は、人文学の幅広い学びを通じて...",
        wordCount: 198,
        createdAt: "2026-03-15T14:30:00Z",
      },
    ],
    status: "draft",
    deadline: "2026-09-01",
    linkedActivities: [],
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-15T14:30:00Z",
  },
  {
    id: "doc-002",
    userId: "mock_user_001",
    type: "自己推薦書",
    universityId: "doshisha-u",
    facultyId: "law",
    universityName: "同志社大学",
    facultyName: "法学部",
    title: "同志社大学法学部 自己推薦書",
    content: "私は高校3年間を通じて、模擬国連活動に力を注いできました。代表として国際問題について議論し、多角的な視点から解決策を模索する経験は、法学を学ぶ上での大きな土台となっています。\n\n特に、難民問題をテーマにした全国大会では、各国の法制度を比較研究し、国際法の枠組みの中で実現可能な解決策を提案しました。この経験から、法律が社会正義を実現するための重要な手段であることを深く理解しました。\n\n同志社大学法学部の少人数教育と実践的なカリキュラムのもと、国際法と人権法を専門的に学び、将来は国際機関で法務に携わりたいと考えています。",
    wordCount: 268,
    targetWordCount: 600,
    versions: [
      {
        id: "v1",
        content: "私は高校3年間を通じて...",
        wordCount: 180,
        createdAt: "2026-03-05T09:00:00Z",
      },
      {
        id: "v2",
        content: "私は高校3年間を通じて、模擬国連活動に力を注いできました...",
        wordCount: 268,
        createdAt: "2026-03-12T11:00:00Z",
        feedback: {
          apAlignmentScore: 8,
          structureScore: 7,
          originalityScore: 8,
          overallFeedback: "模擬国連の経験を軸に、法学への関心が明確に示されています。APとの整合性も高く、良い仕上がりです。",
          improvements: [
            "結論部分で、同志社大学ならではの強みをもう少し具体的に述べましょう",
            "難民問題の比較研究について、具体的な成果や学びをもう一つ追加すると説得力が増します",
          ],
          apSpecificNotes: "同志社大学法学部のAPが求める「国際的視野」と「主体的な学び」に合致しています。",
        },
      },
    ],
    status: "reviewed",
    deadline: "2026-10-15",
    linkedActivities: [],
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-12T11:00:00Z",
  },
  {
    id: "doc-003",
    userId: "mock_user_001",
    type: "研究計画書",
    universityId: "osaka-u",
    facultyId: "engineering",
    universityName: "大阪大学",
    facultyName: "工学部",
    title: "大阪大学工学部 研究計画書",
    content: "私は大阪大学工学部において、再生可能エネルギーの効率的な蓄電技術に関する研究に取り組みたいと考えています。\n\n現在、太陽光や風力などの再生可能エネルギーは発電量の変動が大きく、安定供給が課題となっています。私は高校の課題研究で、リチウムイオン電池の劣化メカニズムについて調査し、次世代蓄電池として期待される全固体電池の可能性に注目しました。\n\n入学後は、材料工学の基礎を固めた上で、全固体電池の電解質材料の最適化に関する研究に挑戦したいと考えています。具体的には、イオン伝導性と安定性を両立する新規材料の探索を目標とします。\n\n将来は、研究成果を社会実装につなげ、カーボンニュートラル社会の実現に貢献したいです。",
    wordCount: 296,
    targetWordCount: 400,
    versions: [
      {
        id: "v1",
        content: "私は大阪大学工学部において、再生可能エネルギーの効率的な蓄電技術...",
        wordCount: 296,
        createdAt: "2026-03-18T16:00:00Z",
        feedback: {
          apAlignmentScore: 9,
          structureScore: 8,
          originalityScore: 7,
          overallFeedback: "研究テーマが明確で、高校での課題研究から大学での研究計画まで一貫性があります。完成度の高い研究計画書です。",
          improvements: [
            "全固体電池の研究における具体的なアプローチ（実験手法など）をもう少し詳しく述べると良いでしょう",
          ],
          apSpecificNotes: "大阪大学工学部のAPが重視する「探究心」と「社会課題への意識」が明確に示されています。",
        },
      },
    ],
    status: "final",
    deadline: "2026-08-20",
    linkedActivities: [],
    createdAt: "2026-03-18T16:00:00Z",
    updatedAt: "2026-03-18T16:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get("universityId");

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      const filtered = universityId
        ? MOCK_DOCUMENTS.filter((d) => d.universityId === universityId)
        : MOCK_DOCUMENTS;
      return NextResponse.json({ documents: filtered });
    }

    const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
    const ref = collection(db, "documents");
    const q = universityId
      ? query(ref, where("universityId", "==", universityId), orderBy("updatedAt", "desc"))
      : query(ref, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const documents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Documents list error:", error);
    return NextResponse.json({ documents: MOCK_DOCUMENTS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DocumentCreateRequest = await request.json();

    if (!body.type || !body.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "type, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      userId: "mock_user_001",
      type: body.type,
      universityId: body.universityId,
      facultyId: body.facultyId,
      universityName: body.universityName,
      facultyName: body.facultyName,
      title: `${body.universityName}${body.facultyName} ${body.type}`,
      content: body.initialContent || "",
      wordCount: body.initialContent ? body.initialContent.length : 0,
      targetWordCount: body.targetWordCount,
      versions: [],
      status: "draft",
      deadline: body.deadline,
      linkedActivities: [],
      createdAt: now,
      updatedAt: now,
    };

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        const docRef = await addDoc(collection(db, "documents"), {
          ...newDoc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        newDoc.id = docRef.id;
      } catch (err) {
        console.warn("Firestore save failed:", err);
      }
    }

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json(
      { error: "書類の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
