import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyAuthToken } from "@/lib/firebase/admin";
import { requireFeature } from "@/lib/api/subscription";
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

export async function GET(request: NextRequest) {
  try {
    const gate = await requireFeature(request, "documentEditor");
    if (gate) return gate;

    const auth = await verifyAuthToken(request);
    const uid = auth?.uid ?? (process.env.NODE_ENV === "development" ? "dev-user" : null);

    if (!adminDb) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    if (!uid) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get user profile for targetUniversities
    const userDoc = await adminDb.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const targetUniversities: Array<{ universityId: string; facultyId: string }> =
      userData?.targetUniversities ?? [];

    if (targetUniversities.length === 0) {
      return NextResponse.json({ checklists: [] });
    }

    // Fetch university data and user documents in parallel
    const [universityDocs, userDocumentsSnap] = await Promise.all([
      Promise.all(
        targetUniversities.map((t) =>
          adminDb!.doc(`universities/${t.universityId}`).get()
        )
      ),
      adminDb.collection(`users/${uid}/documents`).get(),
    ]);

    // Index existing documents by universityId + type for quick lookup
    const existingDocs = new Map<string, { id: string; status: DocumentStatus; deadline?: string }>();
    for (const doc of userDocumentsSnap.docs) {
      const data = doc.data();
      const key = `${data.universityId}:${data.type}`;
      existingDocs.set(key, {
        id: doc.id,
        status: data.status as DocumentStatus,
        deadline: data.deadline,
      });
    }

    const checklists: UniversityChecklist[] = [];

    for (let i = 0; i < targetUniversities.length; i++) {
      const target = targetUniversities[i];
      const uniDoc = universityDocs[i];
      if (!uniDoc.exists) continue;

      const uniData = uniDoc.data();
      const faculty = uniData?.faculties?.find(
        (f: { id: string }) => f.id === target.facultyId
      );
      if (!faculty) continue;

      // Get required document types from faculty's admission info
      const requiredTypes: DocumentType[] =
        faculty.requiredDocuments ?? faculty.admissionRequirements?.documents ?? [];

      const items: ChecklistItem[] = requiredTypes.map((type: DocumentType) => {
        const key = `${target.universityId}:${type}`;
        const existing = existingDocs.get(key);
        return {
          type,
          status: existing?.status ?? ("draft" as DocumentStatus),
          documentId: existing?.id,
          deadline: existing?.deadline ?? faculty.deadline,
        };
      });

      checklists.push({
        universityId: target.universityId,
        universityName: uniData?.name ?? target.universityId,
        facultyName: faculty.name ?? target.facultyId,
        items,
      });
    }

    return NextResponse.json({ checklists });
  } catch (error) {
    console.error("Checklist error:", error);
    return NextResponse.json({ error: "チェックリストの取得に失敗しました" }, { status: 500 });
  }
}
