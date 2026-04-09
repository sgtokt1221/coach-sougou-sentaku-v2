import { NextRequest, NextResponse } from "next/server";
import { buildMatchingChatPrompt } from "@/lib/ai/prompts/matching-chat";
import { matchUniversities } from "@/lib/matching/engine";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, profile } = body as {
      message: string;
      history?: Array<{ role: string; content: string }>;
      profile?: { gpa?: number; englishCerts?: { type: string; score?: string; grade?: string }[] };
    };

    if (!message) {
      return NextResponse.json({ error: "message は必須です" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません", available: false }, { status: 503 });
    }

    // 大学データ取得
    let universities: University[] = MOCK_UNIVERSITIES;
    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { collection, getDocs } = await import("firebase/firestore");
        const snap = await getDocs(collection(db, "universities"));
        if (!snap.empty) {
          universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
        }
      } catch {}
    }

    // スコアマッチング実行
    const matchResults = await matchUniversities(profile ?? {}, universities);

    // 大学データサマリー作成
    const uniSummary = universities
      .map((u) =>
        u.faculties
          .map((f) => `${u.name} ${f.name}（ID: ${u.id}:${f.id}）AP: ${(f.admissionPolicy ?? "").substring(0, 150)}`)
          .join("\n")
      )
      .join("\n");

    // 自己分析データ取得
    let selfAnalysis = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { adminAuth, adminDb } = await import("@/lib/firebase/admin");
        if (adminAuth && adminDb) {
          const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
          const saDoc = await adminDb.doc(`selfAnalysis/${decoded.uid}`).get();
          if (saDoc.exists) {
            const sa = saDoc.data()!;
            selfAnalysis = {
              values: sa.values?.coreValues,
              strengths: sa.strengths?.strengths,
              interests: sa.interests?.fields,
              vision: sa.vision?.longTermVision,
              selfStatement: sa.identity?.selfStatement,
            };
          }
        }
      } catch {}
    }

    const systemPrompt = buildMatchingChatPrompt(uniSummary, matchResults, selfAnalysis);

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

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // suggestionsのJSON抽出
    let suggestions = null;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        suggestions = parsed.suggestions ?? null;
      } catch {}
    }

    // JSON部分を除いたテキスト
    const cleanText = text.replace(/```json[\s\S]*?```/, "").trim();

    return NextResponse.json({ response: cleanText, suggestions });
  } catch (error) {
    console.error("Matching chat error:", error);
    return NextResponse.json({ error: "マッチングチャット中にエラーが発生しました" }, { status: 500 });
  }
}
