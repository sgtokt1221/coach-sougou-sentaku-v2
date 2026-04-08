import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildStoryCheckPrompt } from "@/lib/ai/prompts/story-check";
import type { StoryCheckReport } from "@/lib/types/story-check";

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
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const userId = body.userId || "dev-user";

        // Fetch documents for this university/faculty
        const docsSnap = await adminDb
          .collection(`users/${userId}/documents`)
          .where("universityId", "==", universityId)
          .where("facultyId", "==", facultyId)
          .get();
        docsSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = d.data();
          materials.documents.push({
            type: data.type,
            title: data.title,
            content: data.content,
          });
        });

        // Fetch recent essays (top-level collection)
        const essaysSnap = await adminDb
          .collection("essays")
          .where("userId", "==", userId)
          .orderBy("submittedAt", "desc")
          .limit(5)
          .get();
        essaysSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = d.data();
          materials.essays.push({
            topic: data.topic || data.title || "無題",
            content: data.ocrText || data.content || "",
            score: data.scores?.total,
          });
        });

        // Fetch recent interviews (top-level collection)
        const interviewsSnap = await adminDb
          .collection("interviews")
          .where("userId", "==", userId)
          .orderBy("startedAt", "desc")
          .limit(5)
          .get();
        interviewsSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
          const data = d.data();
          materials.interviews.push({
            mode: data.mode || "個人面接",
            summary: data.summary,
          });
        });

        // Fetch all activities
        const activitiesSnap = await adminDb
          .collection(`users/${userId}/activities`)
          .get();
        activitiesSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ストーリーチェックにはAPIキーが必要です", available: false },
        { status: 503 }
      );
    }

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

    return NextResponse.json(
      { error: "AIからの応答を解析できませんでした" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Story check error:", error);
    return NextResponse.json(
      { error: "一貫性チェックに失敗しました" },
      { status: 500 }
    );
  }
}
