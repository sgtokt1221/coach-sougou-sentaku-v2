import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Invitation } from "@/lib/types/invitation";

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["admin", "superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const code = crypto.randomBytes(4).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const invitation: Invitation = {
    code,
    role: "teacher",
    status: "pending",
    createdBy: authResult.uid,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (!adminDb) {
    return NextResponse.json(invitation);
  }

  try {
    await adminDb.doc(`invitations/${code}`).set({
      role: "teacher",
      status: "pending",
      createdBy: authResult.uid,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json(invitation);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "招待コード発行に失敗しました",
      },
      { status: 500 }
    );
  }
}
