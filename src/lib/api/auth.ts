import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/firebase/admin";

export async function requireRole(
  request: Request,
  allowedRoles: string[]
): Promise<{ uid: string; role: string } | NextResponse> {
  const authResult = await verifyAuthToken(request);

  // dev mode bypass: if no admin SDK configured, check devRole header
  if (!authResult) {
    const devRole = request.headers.get("X-Dev-Role");
    if (process.env.NODE_ENV === "development" && devRole) {
      if (!allowedRoles.includes(devRole)) {
        return NextResponse.json(
          { error: "権限がありません" },
          { status: 403 }
        );
      }
      return { uid: "dev-user", role: devRole };
    }
    // If no auth at all in dev, allow for backward compat with mock data
    if (process.env.NODE_ENV === "development") {
      return { uid: "dev-user", role: "admin" };
    }
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  if (!allowedRoles.includes(authResult.role)) {
    return NextResponse.json(
      { error: "権限がありません" },
      { status: 403 }
    );
  }

  return authResult;
}
