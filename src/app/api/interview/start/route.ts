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
    const body: InterviewStartRequest & { inputMode?: string } = await request.json();
    const { universityId, facultyId, mode, userId, inputMode } = body;
    const resolvedInputMode = inputMode ?? "text";

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

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");

        const universityDoc = await getDoc(doc(db, "universities", universityId));
        if (universityDoc.exists()) {
          const universityData = universityDoc.data();
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
          const weaknessQuery = query(
            collection(db, "users", userId, "weaknesses"),
            where("resolved", "==", false)
          );
          const weaknessDocs = await getDocs(weaknessQuery);
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
      const mockResponse: InterviewStartResponse = {
        ...MOCK_START,
        sessionId: "mock-interview-" + Date.now(),
        universityContext: { universityName, facultyName, admissionPolicy },
      };
      return NextResponse.json(mockResponse);
    }

    const client = new Anthropic();
    const systemPrompt = buildInterviewSystemPrompt(mode, universityName, facultyName, admissionPolicy, weaknessList, interviewTendency);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: "面接を開始してください。開始の挨拶と最初の質問をしてください。" }],
    });

    const openingMessage =
      response.content[0].type === "text"
        ? response.content[0].text
        : MOCK_START.openingMessage;

    const sessionId = crypto.randomUUID();

    if (db) {
      try {
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(doc(db, "interviews", sessionId), {
          userId: userId ?? null,
          universityId,
          facultyId,
          mode,
          status: "in_progress",
          startedAt: serverTimestamp(),
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
