import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview";
import type { InterviewStartRequest, InterviewStartResponse } from "@/lib/types/interview";
import type { WeaknessRecord } from "@/lib/types/growth";
import type { InterviewTendency } from "@/lib/types/university";
import { resolveSpeaker, DEFAULT_INTERVIEWER } from "@/lib/interview/speakers";

/**
 * オープニングメッセージの最初の1文だけ TTS で先行生成し、base64 で返す。
 * これでクライアントは TTS fetch のラウンドトリップ(~2秒)を省略できる。
 */
async function prefetchOpeningAudio(
  openingMessage: string,
): Promise<{ audioBase64: string; voice: string; text: string } | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  try {
    // 「次の 【話者名】 の直前まで」を最初の 1 発話として切り出す
    // 例: "【司会】おはようございます。本日は..." → 【健太】の直前まで
    const bracketPattern = /[【\[][^】\]]+[】\]]/g;
    const brackets: number[] = [];
    let bm: RegExpExecArray | null;
    while ((bm = bracketPattern.exec(openingMessage)) !== null) {
      brackets.push(bm.index);
    }

    let firstText = openingMessage;
    if (brackets.length >= 2) {
      firstText = openingMessage.slice(0, brackets[1]).trim();
    }

    // あまりに長い場合はレイテンシ優先で先頭 1 文に丸める
    if (firstText.length > 250) {
      const prefixMatch = firstText.match(/^[【\[][^】\]]+[】\]]/);
      const prefix = prefixMatch ? prefixMatch[0] : "";
      const rest = prefix ? firstText.slice(prefix.length) : firstText;
      const sentences = rest
        .split(/(?<=[。！？!?])/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (sentences.length > 0) {
        firstText = prefix + sentences[0];
      }
    }

    if (!firstText) return null;

    // 話者を抽出して voice 決定(接頭辞【話者名】を除いた本文で音声生成)
    const { profile, body } = resolveSpeaker(firstText, DEFAULT_INTERVIEWER);
    const ttsText = body || firstText;

    const callOpenAI = (model: string) =>
      fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: ttsText,
          voice: profile.voice,
          response_format: "mp3",
        }),
      });

    let ttsRes = await callOpenAI("gpt-4o-mini-tts");
    if (!ttsRes.ok && (ttsRes.status === 400 || ttsRes.status === 404)) {
      ttsRes = await callOpenAI("tts-1");
    }
    if (!ttsRes.ok) return null;

    const buffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { audioBase64: base64, voice: profile.voice, text: firstText };
  } catch (err) {
    console.warn("[interview/start] prefetch TTS failed", err);
    return null;
  }
}

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
        } catch (authErr) {
          console.warn("[interview/start] Failed to verify ID token:", authErr);
        }
      }
      // dev mode fallback
      if (!userId && process.env.NODE_ENV === "development") {
        const devRole = request.headers.get("X-Dev-Role");
        if (devRole) userId = "dev-user";
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
        { error: "APIキーが設定されていません", available: false },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const systemPrompt = buildInterviewSystemPrompt(mode, universityName, facultyName, admissionPolicy, weaknessList, interviewTendency, presentationContent);

    // GD の導入は 司会→健太→美咲→翔太→司会(締め) の 5 発話を一度に返すため長めに
    const maxTokens = mode === "group_discussion" ? 1800 : 512;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
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

    // 音声モードの場合、最初の1文だけ TTS をサーバー側で先行生成
    // クライアントは受信後に即再生できるので体感レイテンシが大幅短縮
    let preOpeningAudioBase64: string | undefined;
    let preOpeningVoice: string | undefined;
    let preOpeningText: string | undefined;
    if (resolvedInputMode === "voice") {
      const prefetch = await prefetchOpeningAudio(openingMessage);
      if (prefetch) {
        preOpeningAudioBase64 = prefetch.audioBase64;
        preOpeningVoice = prefetch.voice;
        preOpeningText = prefetch.text;
      }
    }

    const result: InterviewStartResponse = {
      sessionId,
      openingMessage,
      estimatedDuration: 15,
      universityContext: { universityName, facultyName, admissionPolicy },
      preOpeningAudioBase64,
      preOpeningVoice,
      preOpeningText,
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
