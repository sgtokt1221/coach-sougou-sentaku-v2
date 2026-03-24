import { NextResponse } from "next/server";
import type { DocumentType, DocumentStatus } from "@/lib/types/document";

interface ChecklistItem {
  type: DocumentType;
  status: DocumentStatus;
  documentId?: string;
  deadline?: string;
}

interface UniversityChecklist {
  universityId: string;
  universityName: string;
  facultyName: string;
  items: ChecklistItem[];
}

const MOCK_CHECKLISTS: UniversityChecklist[] = [
  {
    universityId: "kyoto-u",
    universityName: "京都大学",
    facultyName: "文学部",
    items: [
      { type: "志望理由書", status: "draft", documentId: "doc-001", deadline: "2026-09-01" },
      { type: "学業活動報告書", status: "draft", deadline: "2026-09-01" },
      { type: "学びの設計書", status: "draft", deadline: "2026-09-01" },
    ],
  },
  {
    universityId: "doshisha-u",
    universityName: "同志社大学",
    facultyName: "法学部",
    items: [
      { type: "自己推薦書", status: "reviewed", documentId: "doc-002", deadline: "2026-10-15" },
      { type: "志望理由書", status: "draft", deadline: "2026-10-15" },
    ],
  },
  {
    universityId: "osaka-u",
    universityName: "大阪大学",
    facultyName: "工学部",
    items: [
      { type: "研究計画書", status: "final", documentId: "doc-003", deadline: "2026-08-20" },
      { type: "志望理由書", status: "draft", deadline: "2026-08-20" },
    ],
  },
];

export async function GET() {
  try {
    const { db } = await import("@/lib/firebase/config");
    if (!db) {
      return NextResponse.json({ checklists: MOCK_CHECKLISTS });
    }

    // TODO: Firestoreからチェックリストを動的に構築
    return NextResponse.json({ checklists: MOCK_CHECKLISTS });
  } catch (error) {
    console.error("Checklist error:", error);
    return NextResponse.json({ checklists: MOCK_CHECKLISTS });
  }
}
