import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildResearchEvalSystemPrompt,
  buildMockResearchEval,
  type ResearchEvalResult,
} from "@/lib/ai/prompts/research";

/**
 * POST /api/research/evaluate
 * 「生徒が教える」発表の多モーダル講評。録音(文字起こし)＋添付資料(画像)＋出典を評価し、
 * 3段(肯定/1点改善/次の問い)＋次回カリキュラム反映項目＋資料整合＋出典信頼性 を返す。
 * 録音・AI処理は保護者同意(granted)が前提（同意ゲート）。
 */

interface Attachment {
  /** base64 (data URL でなく生データ部分) */
  dataBase64: string;
  /** image/jpeg | image/png 等 */
  mediaType: string;
}

interface EvaluateBody {
  topic?: string;
  audioBase64?: string;
  mimeType?: string;
  transcriptText?: string;
  attachments?: Attachment[];
  sourceUrls?: string[];
  previousNextItems?: string[];
}

const MAX_ATTACHMENTS = 6;

async function transcribe(audioBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  const buf = Buffer.from(audioBase64, "base64");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mimeType || "audio/webm" }), "rec.webm");
  form.append("model", "whisper-1");
  form.append("language", "ja");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper error ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

function parseEval(raw: string): ResearchEvalResult {
  const m = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`講評のパースに失敗: ${raw.slice(0, 200)}`);
  const p = JSON.parse(m[1]);
  return {
    good: p.good ?? "",
    improve: p.improve ?? "",
    nextQuestion: p.nextQuestion ?? "",
    curriculumItems: Array.isArray(p.curriculumItems) ? p.curriculumItems : [],
    materialConsistency: p.materialConsistency ?? "",
    sourceReliability: p.sourceReliability ?? "",
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ["student"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  try {
    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    // 同意ゲート
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    if (userDoc.data()?.researchConsentStatus !== "granted") {
      return NextResponse.json(
        { error: "録音・AI評価には保護者の同意が必要です。" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as EvaluateBody;
    const topic = (body.topic ?? "").trim();
    const attachments = (body.attachments ?? []).slice(0, MAX_ATTACHMENTS);

    // 1) 文字起こし（録音があれば）
    let transcript = (body.transcriptText ?? "").trim();
    if (body.audioBase64) {
      try {
        const t = await transcribe(body.audioBase64, body.mimeType ?? "audio/webm");
        if (t) transcript = t;
      } catch (e) {
        console.error("transcribe failed:", e);
      }
    }
    if (!transcript && attachments.length === 0) {
      return NextResponse.json(
        { error: "録音または資料のいずれかが必要です。" },
        { status: 400 }
      );
    }

    // 2) 多モーダル講評
    let feedback: ResearchEvalResult;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      feedback = buildMockResearchEval(topic || "探究テーマ");
    } else {
      const client = new Anthropic();
      const userContent: Anthropic.MessageParam["content"] = [];
      for (const a of attachments) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: a.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: a.dataBase64,
          },
        });
      }
      const textParts = [
        `【探究テーマ】${topic || "(未設定)"}`,
        `【発表の文字起こし】\n${transcript || "(録音なし)"}`,
      ];
      if (body.sourceUrls && body.sourceUrls.length > 0) {
        textParts.push(`【出典URL】\n${body.sourceUrls.join("\n")}`);
      }
      if (body.previousNextItems && body.previousNextItems.length > 0) {
        textParts.push(`【前回の次回やること】\n${body.previousNextItems.join("\n")}`);
      }
      userContent.push({ type: "text", text: textParts.join("\n\n") });

      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: buildResearchEvalSystemPrompt(),
        messages: [{ role: "user", content: userContent }],
      });
      const raw = resp.content[0]?.type === "text" ? resp.content[0].text : "";
      feedback = parseEval(raw);
    }

    // 3) 保存（users/{uid}/researchSessions）
    const docRef = await adminDb
      .collection("users")
      .doc(uid)
      .collection("researchSessions")
      .add({
        topic,
        transcript,
        attachmentsCount: attachments.length,
        sourceUrls: body.sourceUrls ?? [],
        feedback,
        nextItems: feedback.curriculumItems,
        createdAt: new Date(),
      });

    return NextResponse.json({ sessionId: docRef.id, transcript, feedback });
  } catch (error) {
    console.error("Research evaluate error:", error);
    return NextResponse.json(
      { error: "講評の生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
