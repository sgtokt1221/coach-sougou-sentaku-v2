import { NextResponse } from "next/server";
import type { PassedDataResponse } from "@/lib/types/passed-data";

const MOCK: PassedDataResponse = {
  universityId: "kyoto-u",
  facultyId: "letters",
  universityName: "京都大学",
  facultyName: "文学部",
  sampleSize: 12,
  statistics: {
    avgEssaySubmissions: 23,
    avgInterviewPractices: 15,
    avgFinalEssayScore: 42,
    avgFinalInterviewScore: 33,
    avgWeaknessResolutionDays: 21,
    topInitialWeaknesses: [
      { area: "結論の曖昧さ", frequency: 72 },
      { area: "具体的エピソード不足", frequency: 65 },
      { area: "AP連動の弱さ", frequency: 58 },
    ],
    topResolvedBeforePass: [
      { area: "結論の曖昧さ", avgDaysToResolve: 18 },
      { area: "具体的エピソード不足", avgDaysToResolve: 25 },
    ],
    scoreProgressionPattern: [
      { weeksBeforeExam: 12, avgScore: 28 },
      { weeksBeforeExam: 10, avgScore: 31 },
      { weeksBeforeExam: 8, avgScore: 34 },
      { weeksBeforeExam: 6, avgScore: 37 },
      { weeksBeforeExam: 4, avgScore: 40 },
      { weeksBeforeExam: 2, avgScore: 42 },
    ],
  },
  insufficient: false,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ universityId: string; facultyId: string }> }
) {
  const { universityId, facultyId } = await params;

  const data: PassedDataResponse = {
    ...MOCK,
    universityId,
    facultyId,
  };

  return NextResponse.json(data);
}
