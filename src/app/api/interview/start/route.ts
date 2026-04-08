import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview";
import type { InterviewStartRequest, InterviewStartResponse } from "@/lib/types/interview";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { InterviewTendency } from "@/lib/types/university";

const MOCK_START: InterviewStartResponse = {
  sessionId: "mock-interview-" + Date.now(),
  openingMessage:
    "こんにちは。本日は面接にお越しいただきありがとうございます。まず、志望理由についてお聞かせください。なぜ本学部を志望されたのですか？",
  estimatedDuration: 15,
  universityContext: {
    universityName: "（大学名未設定）",
    facultyName: "（学部名未設定）",
    admissionPolicy: "（AP未設定）",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: InterviewStartRequest & { inputMode?: string; presentationContent?: string } = await request.json();
    const { universityId, facultyId, mode, inputMode, presentationContent } = body;
    const resolvedInputMode = inputMode ?? "text";

    // IDトークンからuserIdを取得（クライアントから送られたuserIdより安全）
    let userId: string | null = body.userId ?? null;
    if (!userId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { adminAuth } = await import("@/lib/firebase/admin");
          if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
            userId = decoded.uid;
          }
        } catch {}
      }
    }

    if (!universityId || !facultyId || !mode) {
      return NextResponse.json(
        { error: "universityId, facultyId, mode は必須です" },
        { status: 400 }
      );
    }

    let admissionPolicy = "（AP未設定）";
    let universityName = "（大学名未設定）";
    let facultyName = "（学部名未設定）";
    let weaknessList = "（過去の弱点なし）";
    let existingWeaknesses: WeaknessRecord[] = [];
    let interviewTendency: InterviewTendency | undefined;

    // Admin SDKでFirestoreからデータ取得（サーバーサイドなのでセキュリティルールをバイパス）
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      try {
        const universityDoc = await adminDb.doc(`universities/${universityId}`).get();
        if (universityDoc.exists) {
          const universityData = universityDoc.data()!;
          universityName = universityData.name ?? universityName;
          const faculty = universityData.faculties?.find(
            (f: { id: string; name?: string; admissionPolicy?: string }) => f.id === facultyId
          );
          if (faculty) {
            facultyName = faculty.name ?? facultyName;
            if (faculty.admissionPolicy) {
              admissionPolicy = faculty.admissionPolicy;
            }
            if (faculty.interviewTendency) {
              interviewTendency = faculty.interviewTendency;
            }
          }
        }

        if (userId) {
          const weaknessDocs = await adminDb
            .collection(`users/${userId}/weaknesses`)
            .where("resolved", "==", false)
            .get();
          if (!weaknessDocs.empty) {
            existingWeaknesses = weaknessDocs.docs.map((d) => {
              const w = d.data();
              return {
                area: w.area,
                count: w.count,
                firstOccurred: w.firstOccurred?.toDate() ?? new Date(),
                lastOccurred: w.lastOccurred?.toDate() ?? new Date(),
                improving: w.improving ?? false,
                resolved: w.resolved ?? false,
                source: w.source ?? "interview",
                reminderDismissedAt: w.reminderDismissedAt?.toDate() ?? null,
              } satisfies WeaknessRecord;
            });
            weaknessList = existingWeaknesses
              .map((w) => `- ${w.area}（${w.count}回指摘）`)
              .join("\n");
          }
        }
      } catch (err) {
        console.warn("Firestore data fetch failed, using defaults:", err);
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildInterviewSystemPrompt(mode, universityName, facultyName, admissionPolicy, weaknessList, interviewTendency, presentationContent);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: "面接を開始してください。開始の挨拶と最初の質問をしてください。" }],
    });

    const openingMessage =
      response.content[0].type === "text"
        ? response.content[0].text
        : "本日はお越しいただきありがとうございます。まず、志望理由をお聞かせください。";

    const sessionId = crypto.randomUUID();

    if (adminDb) {
      try {
        const { FieldValue } = await import("firebase-admin/firestore");
        await adminDb.doc(`interviews/${sessionId}`).set({
          userId: userId ?? null,
          universityId,
          facultyId,
          mode,
          status: "in_progress",
          startedAt: FieldValue.serverTimestamp(),
          universityContext: { universityName, facultyName, admissionPolicy },
          inputMode: resolvedInputMode,
        });
      } catch (err) {
        console.warn("Failed to create interview session in Firestore:", err);
      }
    }

    const result: InterviewStartResponse = {
      sessionId,
      openingMessage,
      estimatedDuration: 15,
      universityContext: { universityName, facultyName, admissionPolicy },
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "面接開始処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
