import { NextRequest, NextResponse } from "next/server";
import { generateSessionSummary } from "@/lib/ai/generate-session-summary";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, type } = body;

    const summary = await generateSessionSummary({ notes, type });

    const { db } = await import("@/lib/firebase/config");
    if (db) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "sessions", id), { summary });
      } catch (err) {
        console.warn("Failed to save summary:", err);
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Session summary error:", error);
    const fallbackSummary = await generateSessionSummary({});
    return NextResponse.json({ summary: fallbackSummary });
  }
}
