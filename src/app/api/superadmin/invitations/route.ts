import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import type { Invitation } from "@/lib/types/invitation";

const mockInvitations: Invitation[] = [
  {
    code: "a1b2c3d4",
    role: "admin",
    status: "used",
    createdBy: "sa_001",
    createdAt: "2026-03-15T10:00:00.000Z",
    expiresAt: "2026-03-22T10:00:00.000Z",
    usedBy: "admin_001",
    usedAt: "2026-03-16T14:30:00.000Z",
    usedEmail: "admin-taro@example.com",
  },
  {
    code: "e5f6g7h8",
    role: "admin",
    status: "pending",
    createdBy: "sa_001",
    createdAt: "2026-03-20T09:00:00.000Z",
    expiresAt: "2026-03-27T09:00:00.000Z",
  },
];

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!adminDb) {
    return NextResponse.json(mockInvitations);
  }

  try {
    const snapshot = await adminDb
      .collection("invitations")
      .orderBy("createdAt", "desc")
      .get();

    const invitations: Invitation[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        code: doc.id,
        role: data.role,
        status: data.status,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        usedBy: data.usedBy,
        usedAt: data.usedAt?.toDate?.()?.toISOString(),
        usedEmail: data.usedEmail,
      };
    });

    return NextResponse.json(invitations);
  } catch {
    return NextResponse.json(mockInvitations);
  }
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  const code = crypto.randomBytes(4).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (!adminDb) {
    return NextResponse.json({
      code,
      role: "admin",
      status: "pending",
      createdBy: authResult.uid,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  try {
    await adminDb.doc(`invitations/${code}`).set({
      role: "admin",
      status: "pending",
      createdBy: authResult.uid,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json({
      code,
      role: "admin",
      status: "pending",
      createdBy: authResult.uid,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "コード発行に失敗しました" },
      { status: 500 }
    );
  }
}
