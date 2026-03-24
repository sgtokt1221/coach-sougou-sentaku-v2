import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildStoryCheckPrompt } from "@/lib/ai/prompts/story-check";
import type { StoryCheckReport } from "@/lib/types/story-check";

const MOCK_REPORT: StoryCheckReport = {
  overallScore: 72,
  overallAssessment:
    "全体的に志望動機と活動実績の接続が良好ですが、将来ビジョンの具体性と書類間のエピソード活用バランスに改善の余地があります。APキーワードの反映も一部の書類で不足しています。",
  axisScores: [
    {
      axis: "志望動機の一貫性",
      score: 80,
      assessment: "各書類で一貫した志望動機が述べられています。",
      evidence: [
        "志望理由書と面接で同じ原体験に言及",
        "活動実績が志望分野と関連",
      ],
    },
    {
      axis: "将来ビジョンの整合性",
      score: 65,
      assessment:
        "将来目標の方向性は統一されていますが、具体的なキャリアパスの記述にばらつきがあります。",
      evidence: [
        "志望理由書では研究職を、面接ではビジネス寄りの回答",
        "10年後のビジョンが書類間で異なる",
      ],
    },
    {
      axis: "活動実績と主張の接続",
      score: 78,
      assessment: "主要な強みは活動実績で裏付けられています。",
      evidence: [
        "リーダーシップの主張がボランティア活動で実証",
        "一部の強みに具体的な活動エビデンスが不足",
      ],
    },
    {
      axis: "AP適合の一貫性",
      score: 68,
      assessment:
        "APのキーワードが一部の書類では反映されていますが、全体的な浸透が不十分です。",
      evidence: [
        "志望理由書にはAP言及あり",
        "活動報告書でのAP接続が弱い",
      ],
    },
    {
      axis: "エピソード活用バランス",
      score: 70,
      assessment:
        "同じエピソードへの過度な依存が見られます。活用されていない活動実績があります。",
      evidence: [
        "ボランティア活動のエピソードが3つの書類で重複使用",
        "研究活動のエピソードが未活用",
      ],
    },
    {
      axis: "トーン・人物像の統一",
      score: 75,
      assessment:
        "全体的に統一された人物像が描かれていますが、一部でトーンにばらつきがあります。",
      evidence: [
        "志望理由書と自己推薦書で一貫した人物像",
        "面接での回答がやや受動的な印象",
      ],
    },
    {
      axis: "時系列の整合性",
      score: 70,
      assessment: "活動の時系列は概ね整合していますが、一部に曖昧な記述があります。",
      evidence: [
        "活動期間の記載が書類間で一致",
        "高校2年の活動に関する時期の記述が曖昧",
      ],
    },
  ],
  contradictions: [
    {
      severity: "warning",
      source1: { type: "document", id: "doc1", title: "志望理由書" },
      source2: { type: "interview", id: "iv1", title: "模擬面接（個人）" },
      description:
        "志望理由書では「研究者として社会に貢献」と記載しているが、面接では「起業して社会課題を解決」と回答。将来ビジョンに矛盾あり。",
    },
    {
      severity: "info",
      source1: { type: "document", id: "doc2", title: "活動報告書" },
      source2: { type: "activity", id: "act1", title: "ボランティア活動" },
      description:
        "活動報告書の記述と活動実績の期間にわずかなずれ（1ヶ月）あり。",
    },
  ],
  weakConnections: [
    {
      area: "研究活動と志望分野の接続",
      suggestion:
        "研究活動の成果を志望理由書に組み込み、学部での学びとの接続を明示してください。",
    },
    {
      area: "課外活動とAPの接続",
      suggestion:
        "APが求める「主体的な学び」を課外活動のエピソードで具体的に示してください。",
    },
  ],
  storyStrengths: [
    "原体験から志望動機への流れが自然で説得力がある",
    "リーダーシップ経験が複数の活動で一貫して示されている",
    "社会課題への関心が具体的なアクションで裏付けられている",
  ],
  actionItems: [
    {
      priority: "high",
      action:
        "将来ビジョンを「研究」か「ビジネス」のどちらかに統一し、全書類を修正",
      targetMaterial: "志望理由書・面接準備",
    },
    {
      priority: "high",
      action:
        "APキーワード（主体的な学び、協働、課題解決）を活動報告書に反映",
      targetMaterial: "学業活動報告書",
    },
    {
      priority: "medium",
      action: "研究活動のエピソードを少なくとも1つの書類に追加",
      targetMaterial: "自己推薦書",
    },
    {
      priority: "low",
      action: "活動期間の表記を全書類で統一（年月形式）",
      targetMaterial: "全書類",
    },
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, facultyId } = body;

    if (!universityId || !facultyId) {
      return NextResponse.json(
        { error: "universityId と facultyId は必須です" },
        { status: 400 }
      );
    }

    // Fetch university/faculty data
    let universityName = "サンプル大学";
    let facultyName = "サンプル学部";
    let admissionPolicy = "";

    try {
      const { db } = await import("@/lib/firebase/config");
      if (db) {
        const { doc, getDoc } = await import("firebase/firestore");
        const uniDoc = await getDoc(doc(db, "universities", universityId));
        if (uniDoc.exists()) {
          const uniData = uniDoc.data();
          universityName = uniData.name || universityName;
          const faculty = uniData.faculties?.find(
            (f: { id: string; admissionPolicy?: string; name?: string }) =>
              f.id === facultyId
          );
          if (faculty) {
            facultyName = faculty.name || facultyName;
            admissionPolicy = faculty.admissionPolicy || "";
          }
        }
      }
    } catch {
      // Firestore unavailable, use defaults
    }

    // Collect student materials (mock in dev mode)
    const materials = {
      documents: [] as { type: string; title: string; content: string }[],
      essays: [] as { topic: string; content: string; score?: number }[],
      interviews: [] as { mode: string; summary?: string }[],
      activities: [] as {
        title: string;
        category: string;
        description: string;
        structuredData?: {
          motivation: string;
          actions: string[];
          results: string[];
          learnings: string[];
          connection: string;
        };
      }[],
      selfAnalysis: undefined as
        | {
            values: string[];
            strengths: string[];
            vision: string;
            selfStatement: string;
          }
        | undefined,
    };

    // Try fetching from Firestore
    try {
      const { db } = await import("@/lib/firebase/config");
      if (db) {
        const { collection, query, where, getDocs, orderBy, limit } =
          await import("firebase/firestore");
        const userId = body.userId || "dev-user";

        // Fetch documents for this university/faculty
        const docsQuery = query(
          collection(db, `users/${userId}/documents`),
          where("universityId", "==", universityId),
          where("facultyId", "==", facultyId)
        );
        const docsSnap = await getDocs(docsQuery);
        docsSnap.forEach((d) => {
          const data = d.data();
          materials.documents.push({
            type: data.type,
            title: data.title,
            content: data.content,
          });
        });

        // Fetch recent essays
        const essaysQuery = query(
          collection(db, `users/${userId}/essays`),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const essaysSnap = await getDocs(essaysQuery);
        essaysSnap.forEach((d) => {
          const data = d.data();
          materials.essays.push({
            topic: data.topic || data.title || "無題",
            content: data.ocrText || data.content || "",
            score: data.scores?.total,
          });
        });

        // Fetch recent interviews
        const interviewsQuery = query(
          collection(db, `users/${userId}/interviews`),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const interviewsSnap = await getDocs(interviewsQuery);
        interviewsSnap.forEach((d) => {
          const data = d.data();
          materials.interviews.push({
            mode: data.mode || "個人面接",
            summary: data.summary,
          });
        });

        // Fetch all activities
        const activitiesSnap = await getDocs(
          collection(db, `users/${userId}/activities`)
        );
        activitiesSnap.forEach((d) => {
          const data = d.data();
          materials.activities.push({
            title: data.title,
            category: data.category,
            description: data.description,
            structuredData: data.structuredData,
          });
        });
      }
    } catch {
      // Firestore unavailable
    }

    // Try Claude API
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic();
        const prompt = buildStoryCheckPrompt(
          universityName,
          facultyName,
          admissionPolicy,
          materials
        );

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const text =
          message.content[0].type === "text" ? message.content[0].text : "";
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
          text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const report: StoryCheckReport = JSON.parse(jsonStr);
          return NextResponse.json({ report, universityName, facultyName });
        }
      } catch {
        // Fall through to mock
      }
    }

    // Mock fallback
    return NextResponse.json({
      report: MOCK_REPORT,
      universityName,
      facultyName,
    });
  } catch (error) {
    console.error("Story check error:", error);
    return NextResponse.json(
      { error: "一貫性チェックに失敗しました" },
      { status: 500 }
    );
  }
}
