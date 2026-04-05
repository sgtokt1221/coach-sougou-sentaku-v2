import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");

    // トークンからuserIdを取得
    if (!userId || userId === "current") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const { adminAuth } = await import("@/lib/firebase/admin");
          if (adminAuth) {
            const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
            userId = decoded.uid;
          }
        } catch {}
      }
    }

    if (!userId) {
      return NextResponse.json({ interviews: [] });
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json({ interviews: [] });
    }

    const snapshot = await adminDb
      .collection("interviews")
      .where("userId", "==", userId)
      .orderBy("startedAt", "desc")
      .limit(20)
      .get();

    const interviews = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        universityId: data.universityId,
        facultyId: data.facultyId,
        mode: data.mode,
        status: data.status,
        startedAt: data.startedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        duration: data.duration ?? 0,
        scores: data.scores ?? null,
        universityContext: data.universityContext ?? null,
        universityName: data.universityContext?.universityName ?? "",
        facultyName: data.universityContext?.facultyName ?? "",
        totalScore: data.scores?.total ?? 0,
        conversationSummary: data.conversationSummary ?? null,
      };
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error("Interview history error:", error);
    return NextResponse.json({ interviews: [] });
  }
}
