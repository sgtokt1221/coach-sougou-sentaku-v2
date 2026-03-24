import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { db } from "@/lib/firebase/config";

import kyutei from "@/data/universities/kyutei.json";
import kankandouritsu from "@/data/universities/kankandouritsu.json";
import march from "@/data/universities/march.json";
import soukeijochi from "@/data/universities/soukeijochi.json";
import sankinkohryu from "@/data/universities/sankinkohryu.json";

interface UniversityJson {
  id: string;
  name: string;
  shortName: string;
  group: string;
  officialUrl: string;
  faculties: unknown[];
}

const ALL_UNIVERSITIES: UniversityJson[] = [
  ...(kyutei as UniversityJson[]),
  ...(soukeijochi as UniversityJson[]),
  ...(kankandouritsu as UniversityJson[]),
  ...(march as UniversityJson[]),
  ...(sankinkohryu as UniversityJson[]),
];

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;

  if (!db) {
    return NextResponse.json(
      { error: "Firestore not configured" },
      { status: 500 }
    );
  }

  try {
    const { doc, setDoc } = await import("firebase/firestore");
    let count = 0;

    for (const uni of ALL_UNIVERSITIES) {
      await setDoc(
        doc(db, "universities", uni.id),
        {
          id: uni.id,
          name: uni.name,
          shortName: uni.shortName,
          group: uni.group,
          officialUrl: uni.officialUrl,
          faculties: uni.faculties,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      count++;
    }

    return NextResponse.json({
      success: true,
      message: `${count} universities seeded.`,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed: " + (error instanceof Error ? error.message : "unknown") },
      { status: 500 }
    );
  }
}
