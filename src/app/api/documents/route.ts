import { NextRequest, NextResponse } from "next/server";
import { defaultDocumentTitle } from "@/lib/documents/title";
import { requireFeature } from "@/lib/api/subscription";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Document, DocumentCreateRequest } from "@/lib/types/document";
import { ensureFacultyInfo } from "@/lib/universities/faculty-info-request";
import { setSubmissionPlanned } from "@/lib/documents/companion";

/**
 * 認証済みユーザーの書類一覧を返す。
 * グローバル `documents` コレクションを `userId` で絞り込む形式
 * (将来サブコレクション化する余地は残しつつ、現状の保存パスを維持)。
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get("universityId");

    const ref = adminDb.collection("documents");
    const q = universityId
      ? ref
          .where("userId", "==", auth.uid)
          .where("universityId", "==", universityId)
          .orderBy("updatedAt", "desc")
      : ref.where("userId", "==", auth.uid).orderBy("updatedAt", "desc");

    const snapshot = await q.get();
    const documents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Documents list error:", error);
    return NextResponse.json(
      { error: "書類一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

/**
 * 認証済みユーザーで新規書類を作成する。
 */
export async function POST(request: NextRequest) {
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

    const body: DocumentCreateRequest = await request.json();

    if (!body.type || !body.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "type, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const docData = {
      userId: auth.uid,
      type: body.type,
      universityId: body.universityId,
      facultyId: body.facultyId,
      universityName: body.universityName,
      facultyName: body.facultyName,
      title: defaultDocumentTitle(
        body.universityName ?? "",
        body.facultyName ?? "",
        body.type ?? ""
      ),
      content: body.initialContent || "",
      wordCount: body.initialContent ? body.initialContent.length : 0,
      targetWordCount: body.targetWordCount,
      versions: [],
      status: "draft" as const,
      deadline: body.deadline,
      linkedActivities: [],
      createdAt: now,
      updatedAt: now,
    };

    if (body.wizardState !== undefined) {
      (docData as Record<string, unknown>).wizardState = body.wizardState;
    }

    const docRef = await adminDb.collection("documents").add(docData);
    // 2通まとめて作るときは、最初から提出予定にする（同じ学部・同じ種類の前の印は外す）
    if (body.submissionPlanned === true) {
      await setSubmissionPlanned(auth.uid, docRef.id, true);
    }
    // その学部の公式サイトの情報がまだ無ければ、裏で調べ始める（下書きの前に間に合わせる）
    await ensureFacultyInfo(body.universityId, body.facultyId);

    const newDoc: Document = {
      id: docRef.id,
      ...docData,
      ...(body.submissionPlanned === true ? { submissionPlanned: true } : {}),
    };

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json(
      { error: "書類の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
