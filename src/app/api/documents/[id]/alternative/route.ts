import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getFrameworkByType } from "@/lib/templates/frameworks";
import {
  ALTERNATIVE_REASONS,
  type AlternativeReason,
} from "@/lib/ai/prompts/statement";
import {
  ALTERNATIVE_DAILY_LIMIT,
  alternativeRemaining,
} from "@/lib/documents/alternative";
import { jstDayKey } from "@/lib/utils/activity-heatmap";
import {
  DraftInputError,
  DraftOutputError,
  loadStatementMaterial,
  loadTemplateMaterial,
  mockStatementDraft,
  writeStatementDraft,
  writeTemplateDraft,
} from "@/lib/documents/draft-generation";
import type { DocumentGeneration } from "@/lib/types/document";

/**
 * AI で作った下書きの「別の案」を作る（2026-11-26）。保存した生成条件（documents.generation）で
 * もう一度書かせ、前の案と生徒が選んだ理由を足す。本文は保存しない（生徒が見比べて
 * 「置き換える」を選んだときに、画面が保存する）。1書類につき日本時間の1日3回まで。
 */
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await requireRole(request, ["student"]);
    if (auth instanceof NextResponse) return auth;

    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }
    const db = adminDb;

    const { id } = await params;
    const docRef = db.doc(`documents/${id}`);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    const data = snap.data()!;
    if (data.userId !== auth.uid) {
      return NextResponse.json(
        { error: "この書類へのアクセス権がありません" },
        { status: 403 }
      );
    }
    const generation = data.generation as DocumentGeneration | undefined;
    if (!generation) {
      return NextResponse.json(
        { error: "AI で作った下書きだけ、別の案を作れます" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason as AlternativeReason;
    if (!ALTERNATIVE_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: "理由を選んでください" },
        { status: 400 }
      );
    }
    const previousDraft =
      typeof body?.content === "string" && body.content.trim()
        ? body.content
        : String(data.content ?? "");

    if (alternativeRemaining(data.alternativeUsage) <= 0) {
      return NextResponse.json(
        {
          error: `別の案は1日${ALTERNATIVE_DAILY_LIMIT}回までです。明日また作れます`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const alternative = { reason, previousDraft };
    const documentType = String(data.type ?? "志望理由書");
    const targetWordCount =
      generation.targetWordCount || data.targetWordCount || 800;
    const emphasis = generation.emphasis ?? "";
    const isDev = process.env.NODE_ENV === "development";
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!isDev && !apiKey) {
      return NextResponse.json(
        { error: "AI機能は現在利用できません", available: false },
        { status: 503 }
      );
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk");

    let draft: string;
    if (generation.source === "draft") {
      const framework = generation.frameworkType
        ? getFrameworkByType(generation.frameworkType)
        : undefined;
      if (!framework) {
        return NextResponse.json(
          { error: "下書きの型が見つかりません" },
          { status: 400 }
        );
      }
      const material = await loadTemplateMaterial(
        auth.uid,
        data.universityId,
        data.facultyId,
        generation.activityIds ?? null,
        { universityName: data.universityName, facultyName: data.facultyName }
      );
      draft = isDev
        ? `（別の案: ${reason}）\n\n${previousDraft}`
        : (
            await writeTemplateDraft(new Anthropic({ apiKey }), material, {
              framework,
              frameworkType: generation.frameworkType!,
              documentType,
              targetWordCount,
              emphasis,
              alternative,
            })
          ).draft;
    } else {
      const material = await loadStatementMaterial(
        auth.uid,
        data.universityId,
        data.facultyId
      );
      draft = isDev
        ? mockStatementDraft(material, alternative).draft
        : (
            await writeStatementDraft(new Anthropic({ apiKey }), material, {
              targetWordCount,
              emphasis,
              documentType,
              alternative,
            })
          ).draft;
    }

    // 作れたときだけ数える（失敗した回は数えない）
    const today = jstDayKey(Date.now());
    const remaining = await db.runTransaction(async (tx) => {
      const latest = (await tx.get(docRef)).data();
      const usage = latest?.alternativeUsage as
        | { date: string; count: number }
        | undefined;
      const count = usage?.date === today ? usage.count + 1 : 1;
      tx.update(docRef, { alternativeUsage: { date: today, count } });
      return Math.max(0, ALTERNATIVE_DAILY_LIMIT - count);
    });

    return NextResponse.json({ draft, remaining });
  } catch (error) {
    if (error instanceof DraftInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof DraftOutputError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Alternative draft error:", error);
    return NextResponse.json(
      { error: "別の案を作れませんでした" },
      { status: 500 }
    );
  }
}
