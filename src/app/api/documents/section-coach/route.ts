import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { requireFeature } from "@/lib/api/subscription";
import {
  buildDocumentSectionCoachSystemPrompt,
  extractSuggestion,
  stripSuggestion,
  type DocumentCoachSelfAnalysisContext,
} from "@/lib/ai/prompts/document-coach";
import { stripMarkdown } from "@/lib/ai/plain-text";
import type {
  DocumentCoachMessage,
  DocumentSectionCoachRequest,
  DocumentSectionCoachResponse,
  DocumentSectionCoachThread,
} from "@/lib/types/document-coach";
import { prepareAdmissionPolicy } from "@/lib/ai/admission-policy";
import { getDocumentTemplate } from "@/lib/templates/document-templates";
import { AI_MODEL_SONNET } from "@/lib/ai/prompt-versions";

export const maxDuration = 60;

const MAX_CONTENT_CHARS = 8000;
const MAX_HISTORY_TURNS = 10;

function truncate(s: string, max: number = MAX_CONTENT_CHARS): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * POST /api/documents/section-coach
 * 1 ターン分の対話を処理し、Firestore にスレッドを upsert する。
 */
export async function POST(request: NextRequest) {
  const gate = await requireFeature(request, "documentEditor");
  if (gate) return gate;

  const auth = await requireRole(request, ["student", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const body = (await request
    .json()
    .catch(() => null)) as DocumentSectionCoachRequest | null;
  if (
    !body ||
    typeof body.userMessage !== "string" ||
    body.userMessage.trim().length === 0 ||
    !body.frameworkType ||
    !body.sectionId ||
    !body.sectionTitle
  ) {
    return NextResponse.json(
      {
        error: "frameworkType, sectionId, sectionTitle, userMessage は必須です",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI 機能は現在利用できません", available: false },
      { status: 503 }
    );
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // スレッド取得 or 新規作成
  const threadsCol = adminDb.collection(`users/${uid}/documentCoachThreads`);
  let threadDocRef = body.threadId
    ? threadsCol.doc(body.threadId)
    : threadsCol.doc();
  let existing: DocumentSectionCoachThread | null = null;
  if (body.threadId) {
    const snap = await threadDocRef.get();
    if (snap.exists) {
      existing = snap.data() as DocumentSectionCoachThread;
      if (existing.studentId && existing.studentId !== uid) {
        return NextResponse.json(
          { error: "権限がありません" },
          { status: 403 }
        );
      }
    } else {
      threadDocRef = threadsCol.doc();
      existing = null;
    }
  }

  // 大学名・学部名・AP取得 (任意)
  let universityName: string | undefined;
  let facultyName: string | undefined;
  let admissionPolicy: string | undefined;
  if (body.universityId) {
    try {
      const uniSnap = await adminDb
        .doc(`universities/${body.universityId}`)
        .get();
      if (uniSnap.exists) {
        const uni = uniSnap.data() as {
          name?: string;
          faculties?: Array<{
            id: string;
            name?: string;
            admissionPolicy?: string;
          }>;
        };
        universityName = uni.name;
        const fac = uni.faculties?.find((f) => f.id === body.facultyId);
        if (fac) {
          facultyName = fac.name;
          if (fac.admissionPolicy) {
            admissionPolicy = prepareAdmissionPolicy(fac.admissionPolicy).text;
          }
        }
      }
    } catch (err) {
      console.warn("[documents/section-coach] university fetch failed:", err);
    }
  }

  // 自己分析取得 (任意。認証済み uid のみ。/api/self-analysis と同じトップレベルパス)
  // ※ admin/superadmin が呼んだ場合は本人=管理者の uid を見るため通常は未取得 (undefined) で続行する。
  let selfAnalysis: DocumentCoachSelfAnalysisContext | undefined;
  try {
    const saDoc = await adminDb.doc(`selfAnalysis/${uid}`).get();
    if (saDoc.exists) {
      const sa = saDoc.data()!;
      selfAnalysis = {
        values: sa.values?.coreValues,
        strengths: sa.strengths?.strengths,
        vision: sa.vision?.longTermVision,
        selfStatement: sa.identity?.selfStatement,
        uniqueNarrative: sa.identity?.uniqueNarrative,
      };
    }
  } catch (err) {
    console.warn("[documents/section-coach] selfAnalysis fetch failed:", err);
  }

  const historyMessages: DocumentCoachMessage[] = existing?.messages ?? [];
  const trimmedHistory = historyMessages.slice(-MAX_HISTORY_TURNS * 2);
  const turnCount = Math.floor(trimmedHistory.length / 2) + 1;

  const systemPrompt = buildDocumentSectionCoachSystemPrompt({
    frameworkType: body.frameworkType,
    sectionTitle: body.sectionTitle,
    sectionGuidingQuestion: body.sectionGuidingQuestion ?? "",
    currentSectionContent: truncate(body.currentSectionContent ?? ""),
    // 他セクションは参照用。丸ごと渡すと長いので1つずつ切り詰める
    otherSections: (body.otherSections ?? [])
      .filter((s) => s?.content?.trim())
      .slice(0, 10)
      .map((s) => ({ title: s.title, content: truncate(s.content, 1200) })),
    documentType: body.documentType,
    documentStructure: getDocumentTemplate(body.documentType ?? "")?.sampleStructure,
    universityName,
    facultyName,
    admissionPolicy,
    selfAnalysis,
    turnCount,
  });

  const userMsg: DocumentCoachMessage = {
    role: "user",
    content: body.userMessage.trim(),
    at: new Date().toISOString(),
  };

  // Claude 呼び出し
  let reply = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const response = await client.messages.create({
      model: AI_MODEL_SONNET,
      // 背景知識を聞かれたときは長めに答えるため、800 では途中で切れる
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userMsg.content },
      ],
    });
    reply = stripMarkdown(
      response.content[0]?.type === "text" ? response.content[0].text : ""
    );
  } catch (err) {
    console.error("[documents/section-coach] Claude call failed:", err);
    return NextResponse.json(
      { error: "AI 応答に失敗しました" },
      { status: 500 }
    );
  }

  if (!reply.trim()) {
    return NextResponse.json(
      { error: "AI が応答を生成できませんでした" },
      { status: 500 }
    );
  }

  const applicableText = extractSuggestion(reply);
  const replyClean = stripSuggestion(reply);
  // Firestore に保存するのは振り込み候補を含むフル応答 (履歴復元時に再生する)
  const assistantMsg: DocumentCoachMessage = {
    role: "assistant",
    content: reply.trim(),
    at: new Date().toISOString(),
  };

  const now = new Date().toISOString();
  const nextMessages = [...historyMessages, userMsg, assistantMsg];
  const threadDoc: DocumentSectionCoachThread = {
    id: threadDocRef.id,
    studentId: uid,
    docId: body.docId ?? null,
    frameworkType: body.frameworkType,
    sectionId: body.sectionId,
    sectionTitle: body.sectionTitle,
    messages: nextMessages,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await threadDocRef.set(threadDoc);

  const resBody: DocumentSectionCoachResponse = {
    threadId: threadDocRef.id,
    reply: replyClean,
    applicableText,
  };
  return NextResponse.json(resBody);
}

/**
 * GET /api/documents/section-coach
 * クエリパラメータ:
 * - threadId: 指定スレッドのメッセージ履歴を返す
 * - docId + sectionId: 該当書類・セクションの既存スレッドを検索して返す
 */
export async function GET(request: NextRequest) {
  const gate = await requireFeature(request, "documentEditor");
  if (gate) return gate;

  const auth = await requireRole(request, ["student", "admin", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  const { uid } = auth;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const docId = searchParams.get("docId");
  const sectionId = searchParams.get("sectionId");

  try {
    if (threadId) {
      const snap = await adminDb
        .doc(`users/${uid}/documentCoachThreads/${threadId}`)
        .get();
      if (!snap.exists) {
        return NextResponse.json({ thread: null });
      }
      return NextResponse.json({ thread: snap.data() });
    }

    if (docId && sectionId) {
      const snap = await adminDb
        .collection(`users/${uid}/documentCoachThreads`)
        .where("docId", "==", docId)
        .where("sectionId", "==", sectionId)
        .limit(1)
        .get();
      if (snap.empty) {
        return NextResponse.json({ thread: null });
      }
      return NextResponse.json({ thread: snap.docs[0].data() });
    }

    return NextResponse.json(
      { error: "threadId または (docId + sectionId) を指定してください" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[documents/section-coach] GET error:", err);
    return NextResponse.json(
      { error: "スレッドの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
