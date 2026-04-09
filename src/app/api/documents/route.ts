import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/api/subscription";
import type { Document, DocumentCreateRequest } from "@/lib/types/document";

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get("universityId");

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
    const ref = collection(db, "documents");
    const q = universityId
      ? query(ref, where("universityId", "==", universityId), orderBy("updatedAt", "desc"))
      : query(ref, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
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

export async function POST(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const body: DocumentCreateRequest = await request.json();

    if (!body.type || !body.universityId || !body.facultyId) {
      return NextResponse.json(
        { error: "type, universityId, facultyId は必須です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      userId: "mock_user_001",
      type: body.type,
      universityId: body.universityId,
      facultyId: body.facultyId,
      universityName: body.universityName,
      facultyName: body.facultyName,
      title: `${body.universityName}${body.facultyName} ${body.type}`,
      content: body.initialContent || "",
      wordCount: body.initialContent ? body.initialContent.length : 0,
      targetWordCount: body.targetWordCount,
      versions: [],
      status: "draft",
      deadline: body.deadline,
      linkedActivities: [],
      createdAt: now,
      updatedAt: now,
    };

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        const docRef = await addDoc(collection(db, "documents"), {
          ...newDoc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        newDoc.id = docRef.id;
      } catch (err) {
        console.warn("Firestore save failed:", err);
      }
    }

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Document create error:", error);
    return NextResponse.json(
      { error: "書類の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
