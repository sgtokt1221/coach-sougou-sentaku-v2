import { NextRequest, NextResponse } from "next/server";
import type { Transcription } from "@/lib/types/interview";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { transcription }: { transcription: Transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: "transcription は必須です" }, { status: 400 });
    }

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "interviews", id), { transcription });
      } catch (err) {
        console.warn("Failed to save transcription:", err);
      }
    }

    return NextResponse.json({ success: true, interviewId: id });
  } catch (error) {
    console.error("Save transcription error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
