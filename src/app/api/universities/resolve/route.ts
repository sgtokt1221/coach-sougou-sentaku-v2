import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const compoundIds = idsParam.split(",").filter(Boolean);

  if (compoundIds.length === 0) {
    return NextResponse.json({ resolved: [] });
  }

  const universities = MOCK_UNIVERSITIES;
  const resolved: {
    universityId: string;
    facultyId: string;
    universityName: string;
    facultyName: string;
  }[] = [];

  for (const compoundId of compoundIds) {
    const [universityId, facultyId] = compoundId.split(":");
    const uni = universities.find((u) => u.id === universityId);
    if (!uni) continue;
    const faculty = uni.faculties?.find((f) => f.id === facultyId);
    resolved.push({
      universityId,
      facultyId: facultyId ?? "",
      universityName: uni.name,
      facultyName: faculty?.name ?? "全学部",
    });
  }

  return NextResponse.json({ resolved });
}
