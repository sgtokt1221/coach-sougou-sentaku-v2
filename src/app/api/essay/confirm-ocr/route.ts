import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { essayId, ocrText } = body;

    if (!essayId || !ocrText) {
      return NextResponse.json(
        { error: "essayId と ocrText は必須です" },
        { status: 400 }
      );
    }

    // Firestoreが設定されている場合のみ更新
    const { db } = await import("@/lib/firebase/config");
    if (db) {
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, "essays", essayId), {
        ocrText,
        status: "ocr_confirmed",
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OCR confirm error:", error);
    return NextResponse.json(
      { error: "OCR確認処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
