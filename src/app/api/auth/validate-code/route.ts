import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { code } = body as { code: string };

  if (!code || !/^[a-f0-9]{8}$/.test(code)) {
    return NextResponse.json({ valid: false, error: "無効なコード形式です" });
  }

  if (!adminDb) {
    // mock: any code is valid
    return NextResponse.json({ valid: true, role: "admin" });
  }

  try {
    const doc = await adminDb.doc(`invitations/${code}`).get();

    if (!doc.exists) {
      return NextResponse.json({ valid: false, error: "招待コードが見つかりません" });
    }

    const data = doc.data()!;

    if (data.status !== "pending") {
      return NextResponse.json({ valid: false, error: "この招待コードは既に使用されています" });
    }

    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(0);
    if (expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: "この招待コードは有効期限切れです" });
    }

    return NextResponse.json({ valid: true, role: data.role });
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : "検証に失敗しました" },
      { status: 500 }
    );
  }
}
