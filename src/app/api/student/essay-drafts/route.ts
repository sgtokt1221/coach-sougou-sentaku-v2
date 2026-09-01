import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { EssayDraft } from "@/lib/types/essay";
import { getThemeById } from "@/data/essay-themes";
import { getPastQuestionById } from "@/data/essay-past-questions";
import { reportMaterials } from "@/data/essay-report-materials";

/**
 * 一覧に出すテーマ名を決める。テーマ選択時は topic が空のままなので、
 * 選択元（過去問・テーマ）の名前を引く。
 * 選択中はテーマ入力欄が隠れるため、topic に残った値は選択前の入力が
 * 残っただけのことがある。選択元がある下書きではそちらを優先する。
 */
function resolveTopicLabel(data: {
  topic?: string;
  themeId?: string;
  pastQuestionId?: string;
  reportMaterialId?: string;
}): string | undefined {
  if (data.reportMaterialId) {
    const m = reportMaterials.find((x) => x.id === data.reportMaterialId);
    if (m) return `レポート / ${m.title}`;
  }
  if (data.pastQuestionId) {
    const pq = getPastQuestionById(data.pastQuestionId);
    if (pq) return `${pq.universityName} ${pq.year}年 ${pq.theme}`;
  }
  if (data.themeId) {
    const theme = getThemeById(data.themeId);
    if (theme) return theme.title;
  }
  return data.topic?.trim() || undefined;
}

/**
 * GET /api/student/essay-drafts
 * 自分の小論文下書き一覧（updatedAt 降順）。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }
    const snap = await adminDb
      .collection(`users/${uid}/essayDrafts`)
      .orderBy("updatedAt", "desc")
      .get();

    const drafts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        directText: data.directText ?? "",
        topic: data.topic ?? "",
        universityId: data.universityId ?? "",
        facultyId: data.facultyId ?? "",
        selectedCompoundId: data.selectedCompoundId ?? "",
        customMaxLength: data.customMaxLength,
        writingDirection: data.writingDirection,
        inputMode: "text",
        universityName: data.universityName ?? "",
        facultyName: data.facultyName ?? "",
        themeId: data.themeId,
        pastQuestionId: data.pastQuestionId,
        homeworkId: data.homeworkId,
        reportMaterialId: data.reportMaterialId,
        topicLabel: resolveTopicLabel(data),
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ??
          (typeof data.createdAt === "string" ? data.createdAt : ""),
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString() ??
          (typeof data.updatedAt === "string" ? data.updatedAt : ""),
      } as EssayDraft;
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Essay drafts GET error:", error);
    return NextResponse.json(
      { error: "下書きの取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/essay-drafts
 * 下書きの新規作成 or 更新（draftId 指定で更新）。
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  try {
    const body = await request.json();
    if (!adminDb) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { FieldValue } = await import("firebase-admin/firestore");
    const isNew = typeof body.draftId !== "string" || !body.draftId;
    const draftId: string = isNew
      ? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : body.draftId;

    const data: Record<string, unknown> = {
      directText:
        typeof body.directText === "string"
          ? body.directText.slice(0, 20000)
          : "",
      topic: typeof body.topic === "string" ? body.topic.slice(0, 2000) : "",
      universityId: body.universityId ?? "",
      facultyId: body.facultyId ?? "",
      selectedCompoundId: body.selectedCompoundId ?? "",
      inputMode: "text",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof body.customMaxLength === "number")
      data.customMaxLength = body.customMaxLength;
    if (
      body.writingDirection === "vertical" ||
      body.writingDirection === "horizontal"
    )
      data.writingDirection = body.writingDirection;
    if (typeof body.universityName === "string")
      data.universityName = body.universityName;
    if (typeof body.facultyName === "string")
      data.facultyName = body.facultyName;
    if (typeof body.themeId === "string") data.themeId = body.themeId;
    if (typeof body.pastQuestionId === "string")
      data.pastQuestionId = body.pastQuestionId;
    if (typeof body.homeworkId === "string") data.homeworkId = body.homeworkId;
    if (typeof body.reportMaterialId === "string")
      data.reportMaterialId = body.reportMaterialId;
    if (isNew) data.createdAt = FieldValue.serverTimestamp();

    await adminDb
      .doc(`users/${uid}/essayDrafts/${draftId}`)
      .set(data, { merge: true });

    return NextResponse.json({ draftId });
  } catch (error) {
    console.error("Essay drafts POST error:", error);
    return NextResponse.json(
      { error: "下書きの保存に失敗しました" },
      { status: 500 }
    );
  }
}
