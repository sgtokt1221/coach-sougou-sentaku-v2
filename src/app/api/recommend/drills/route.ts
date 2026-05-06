import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { recommendDrills } from "@/lib/recommend/drills";
import { PAST_QUESTIONS } from "@/data/essay-past-questions";
import type { DrillRecommendResponse } from "@/lib/types/drill-recommendation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 生徒のみアクセス可能
  const authResult = await requireRole(request, ["student"]);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { uid } = authResult;

  try {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin SDK が設定されていません" },
        { status: 500 }
      );
    }

    // ユーザープロフィールから志望校を取得
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    if (!userData || !userData.targetUniversities || userData.targetUniversities.length === 0) {
      const response: DrillRecommendResponse = {
        recommendations: [],
        hasTargetUniversities: false,
      };
      return NextResponse.json(response);
    }

    // 志望校大学をFirestoreから取得してFaculty情報を解決
    const targetInfos = [];

    for (const targetUniId of userData.targetUniversities) {
      const uniDoc = await adminDb.collection("universities").doc(targetUniId).get();
      if (uniDoc.exists) {
        const uniData = uniDoc.data();
        if (uniData?.faculties && Array.isArray(uniData.faculties)) {
          for (const faculty of uniData.faculties) {
            targetInfos.push({
              universityId: targetUniId,
              universityName: uniData.name,
              facultyName: faculty.name,
              academicField: faculty.academicField,
            });
          }
        }
      }
    }

    // 過去の添削から利用済み過去問IDを取得
    const essaysSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("essays")
      .where("pastQuestionId", "!=", null)
      .get();

    const attemptedQuestionIds = new Set(
      essaysSnapshot.docs
        .map(doc => doc.data().pastQuestionId)
        .filter(Boolean)
    );

    // 推奨ドリルを取得
    const recommendations = recommendDrills(
      targetInfos,
      attemptedQuestionIds,
      PAST_QUESTIONS
    );

    const response: DrillRecommendResponse = {
      recommendations,
      hasTargetUniversities: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("DrillRecommend API Error:", error);
    return NextResponse.json(
      { error: "推奨ドリル取得に失敗しました" },
      { status: 500 }
    );
  }
}