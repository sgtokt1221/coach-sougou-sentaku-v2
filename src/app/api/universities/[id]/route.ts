import { NextRequest, NextResponse } from "next/server";
import { loadUniversityById } from "@/lib/firebase/load-universities";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const university = await loadUniversityById(id);

  if (!university) {
    return NextResponse.json({ error: "University not found" }, { status: 404 });
  }

  return NextResponse.json(university);
}
