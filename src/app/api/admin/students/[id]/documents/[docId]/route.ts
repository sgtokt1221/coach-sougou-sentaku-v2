import { NextRequest, NextResponse } from "next/server";
import { requireRole, scopeByOrganization } from "@/lib/api/auth";
import { getAssignedTeacherIds } from "@/lib/api/teacher-scope";
import { adminDb } from "@/lib/firebase/admin";
import type { DocumentVersion } from "@/lib/types/document";

/** 返す版の上限（新しい順）。本文を丸ごと持つので全部返すと重い */
const MAX_VERSIONS = 20;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const authResult = await requireRole(request, [
    "admin",
    "teacher",
    "superadmin",
  ]);
  if (authResult instanceof NextResponse) return authResult;
  const { uid: callerUid, role } = authResult;
  const { id: studentId, docId } = await params;

  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    // 組織スコーピング（自塾の admin は代行可、担当講師も許可）
    const studentDoc = await adminDb.doc(`users/${studentId}`).get();
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "生徒が見つかりません" },
        { status: 404 }
      );
    }
    const denied = await scopeByOrganization({
      requesterUid: callerUid,
      requesterRole: role,
      studentUid: studentId,
      studentData: {
        managedBy: studentDoc.data()?.managedBy,
        organizationId: studentDoc.data()?.organizationId,
        assignedTeacherIds: getAssignedTeacherIds(studentDoc.data()),
      },
      allowAssignedTeacher: true,
    });
    if (denied) return denied;

    // 実データはグローバル `documents`。userId が対象生徒と一致することを確認。
    const docRef = await adminDb.doc(`documents/${docId}`).get();
    if (!docRef.exists) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }

    const data = docRef.data()!;
    if (data.userId !== studentId) {
      return NextResponse.json(
        { error: "書類が見つかりません" },
        { status: 404 }
      );
    }
    const latestVersion =
      data.versions?.length > 0
        ? data.versions[data.versions.length - 1]
        : null;
    // 添削結果は書類直下に保存される。旧データのため版も見る
    const feedback = data.feedback ?? latestVersion?.feedback;

    // この書類を書いていたときの AIコーチ会話。スレッドが docId を持つので
    // 推定は不要。セクション単位なので複数ある
    const coachThreads = await loadCoachThreads(studentId, docId);

    return NextResponse.json({
      id: docRef.id,
      type: data.type ?? "",
      // AP参照に必要。名前だけだと大学データを引けない
      universityId: data.universityId ?? "",
      facultyId: data.facultyId ?? "",
      universityName: data.universityName ?? "",
      facultyName: data.facultyName ?? "",
      content: latestVersion?.content ?? data.content ?? "",
      // 範囲コメント。管理者画面で本文にドラッグコメントを重ねるために返す
      inlineComments: data.inlineComments ?? [],
      wordCount: data.wordCount ?? 0,
      targetWordCount: data.targetWordCount ?? undefined,
      status: data.status ?? "draft",
      review: data.review ?? undefined,
      // 誰がいつどのコメントで承認/差し戻し/取り消したか
      reviewHistory: data.reviewHistory ?? [],
      aiScore: feedback
        ? {
            apAlignment:
              typeof feedback.apAlignmentScore === "number"
                ? feedback.apAlignmentScore
                : undefined,
            structure: feedback.structureScore,
            originality: feedback.originalityScore,
            expression: feedback.expressionScore,
          }
        : undefined,
      // 日本語の直し（赤ペン）。v4 以降の添削でのみ入る
      languageCorrections: feedback?.languageCorrections ?? [],
      aiLikeness: data.aiLikeness ?? undefined,
      /**
       * 版の履歴。生徒側と同じものを管理者にも返す。
       * 本文は版ごとに丸ごと持つので、多いと重くなる。新しい順に上限を切る。
       */
      versions: (Array.isArray(data.versions) ? data.versions : [])
        .slice(-MAX_VERSIONS)
        .reverse()
        .map((v: DocumentVersion) => ({
          id: v.id,
          content: v.content ?? "",
          wordCount: v.wordCount ?? 0,
          createdAt: v.createdAt ?? "",
          aiScore: v.feedback
            ? {
                apAlignment:
                  typeof v.feedback.apAlignmentScore === "number"
                    ? v.feedback.apAlignmentScore
                    : undefined,
                structure: v.feedback.structureScore,
                originality: v.feedback.originalityScore,
              }
            : undefined,
          feedbackSummary: v.feedback?.overallFeedback ?? undefined,
        })),
      coachThreads,
    });
  } catch (error) {
    console.error("Admin document detail error:", error);
    return NextResponse.json(
      { error: "書類詳細の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/** 1スレッドあたりの返却上限。長い会話でレスポンスが膨らむのを防ぐ */
const COACH_MAX_MESSAGES = 200;

/**
 * 書類に紐づく AIコーチ会話（セクション単位）。
 * documentCoachThreads は docId を持つので、答案と違って推定は要らない。
 */
async function loadCoachThreads(studentId: string, docId: string) {
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .collection(`users/${studentId}/documentCoachThreads`)
      .where("docId", "==", docId)
      .get();
    return snap.docs
      .map((d) => {
        const t = d.data();
        return {
          id: d.id,
          sectionTitle: (t.sectionTitle as string) ?? "セクション",
          updatedAt: (t.updatedAt as string) ?? "",
          messages: Array.isArray(t.messages)
            ? t.messages.slice(0, COACH_MAX_MESSAGES)
            : [],
        };
      })
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  } catch (err) {
    console.warn("[admin/document] coach threads fetch failed:", err);
    return [];
  }
}
