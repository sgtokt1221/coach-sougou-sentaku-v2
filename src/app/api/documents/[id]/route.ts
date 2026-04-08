import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const { doc, getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(doc(db, "documents", id));

    if (!docSnap.exists()) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Document get error:", error);
    return NextResponse.json(
      { error: "書類の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      updatedAt: now,
    };

    if (body.content !== undefined) {
      updates.content = body.content;
      updates.wordCount = body.content.length;

      // Add new version
      const newVersion = {
        id: `v-${Date.now()}`,
        content: body.content,
        wordCount: body.content.length,
        createdAt: now,
      };
      updates.newVersion = newVersion;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.targetWordCount !== undefined) {
      updates.targetWordCount = body.targetWordCount;
    }

    if (body.deadline !== undefined) {
      updates.deadline = body.deadline;
    }

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, updateDoc, arrayUnion, serverTimestamp } = await import("firebase/firestore");
        const firestoreUpdates: Record<string, unknown> = {
          ...updates,
          updatedAt: serverTimestamp(),
        };
        if (updates.newVersion) {
          firestoreUpdates.versions = arrayUnion(updates.newVersion);
          delete firestoreUpdates.newVersion;
        }
        await updateDoc(doc(db, "documents", id), firestoreUpdates);
      } catch (err) {
        console.warn("Firestore update failed:", err);
      }
    }

    return NextResponse.json({
      id,
      ...updates,
      wordCount: body.content !== undefined ? body.content.length : undefined,
    });
  } catch (error) {
    console.error("Document update error:", error);
    return NextResponse.json(
      { error: "書類の更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "documents", id));
      } catch (err) {
        console.warn("Firestore delete failed:", err);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "書類の削除中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
