import { NextRequest, NextResponse } from "next/server";
import { loadAllUniversities } from "@/lib/firebase/load-universities";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");

  const universities = await loadAllUniversities(group);
  return NextResponse.json({ universities });
}
