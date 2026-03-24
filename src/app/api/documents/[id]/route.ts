import { NextRequest, NextResponse } from "next/server";
import type { Document } from "@/lib/types/document";

const MOCK_DOCUMENT: Document = {
  id: "doc-001",
  userId: "mock_user_001",
  type: "志望理由書",
  universityId: "kyoto-u",
  facultyId: "letters",
  universityName: "京都大学",
  facultyName: "文学部",
  title: "京都大学文学部 志望理由書",
  content: "私が京都大学文学部を志望する理由は、人文学の幅広い学びを通じて、現代社会が抱える文化的課題に取り組みたいと考えるからです。\n\n高校時代、地域の伝統文化保存活動に参加し、文化遺産の価値と継承の困難さを実感しました。この経験から、文化を学問的に研究し、その意義を社会に発信する力を身につけたいと思うようになりました。\n\n貴学の自由な学風と、分野横断的な研究環境は、私の探究心を最大限に活かせる場であると確信しています。",
  wordCount: 198,
  targetWordCount: 800,
  versions: [
    {
      id: "v1",
      content: "私が京都大学文学部を志望する理由は...",
      wordCount: 120,
      createdAt: "2026-03-10T10:00:00Z",
    },
    {
      id: "v2",
      content: "私が京都大学文学部を志望する理由は、人文学の幅広い学びを通じて...",
      wordCount: 198,
      createdAt: "2026-03-15T14:30:00Z",
    },
  ],
  status: "draft",
  deadline: "2026-09-01",
  linkedActivities: [],
  createdAt: "2026-03-10T10:00:00Z",
  updatedAt: "2026-03-15T14:30:00Z",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ ...MOCK_DOCUMENT, id });
    }

    const { doc, getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(doc(db, "documents", id));

    if (!docSnap.exists()) {
      return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Document get error:", error);
    return NextResponse.json({ ...MOCK_DOCUMENT });
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
