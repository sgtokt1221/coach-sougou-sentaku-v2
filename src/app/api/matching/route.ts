import { NextRequest, NextResponse } from "next/server";
import { matchUniversities } from "@/lib/matching/engine";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { MatchingRequest, MatchingResponse } from "@/lib/types/matching";
import type { University } from "@/lib/types/university";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gpaParam = searchParams.get("gpa");
  const certType = searchParams.get("certType");
  const certScore = searchParams.get("certScore");

  const profile: MatchingRequest = {};

  if (gpaParam) {
    const parsed = parseFloat(gpaParam);
    if (!isNaN(parsed)) profile.gpa = parsed;
  }

  if (certType) {
    profile.englishCerts = [
      {
        type: certType,
        score: certScore ?? undefined,
      },
    ];
  }

  const mbtiType = searchParams.get("mbtiType");
  if (mbtiType) {
    profile.mbtiType = mbtiType;
  }

  let universities: University[] = MOCK_UNIVERSITIES;

  const { db } = await import("@/lib/firebase/config");
  if (db) {
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "universities"));
      if (!snap.empty) {
        universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
      }
    } catch {
      // fall through to mock data
    }
  }

  const results = await matchUniversities(profile, universities);
  const response: MatchingResponse = {
    results,
    totalUniversities: universities.length,
    matchedCount: results.filter((r) => r.matchScore >= 60).length,
  };

  return NextResponse.json(response);
}
