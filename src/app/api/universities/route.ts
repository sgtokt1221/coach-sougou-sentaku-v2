import { NextRequest, NextResponse } from "next/server";
import { MOCK_UNIVERSITIES } from "@/lib/matching/mockData";
import type { University } from "@/lib/types/university";

/**
 * 同名大学が複数ドキュメントに存在する場合の重複排除。
 * 過去のID変更で残骸docが残っても画面に重複が出ないようにする防御層。
 * 同名のうち faculties が最も多いもの（＝正規データ）を残し、同数なら先勝ち。
 */
function dedupeByName(list: University[]): University[] {
  const best = new Map<string, University>();
  for (const u of list) {
    const cur = best.get(u.name);
    if (!cur || (u.faculties?.length ?? 0) > (cur.faculties?.length ?? 0)) {
      best.set(u.name, u);
    }
  }
  return Array.from(best.values());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");

  let universities: University[] = MOCK_UNIVERSITIES;

  const { adminDb } = await import("@/lib/firebase/admin");
  if (adminDb) {
    try {
      const ref = adminDb.collection("universities");
      const q = group ? ref.where("group", "==", group) : ref;
      const snap = await q.get();
      if (!snap.empty) {
        universities = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as University);
      }
    } catch {
      // fall through to mock data
    }
  }

  if (group) {
    universities = universities.filter((u) => u.group === group);
  }

  universities = dedupeByName(universities);

  return NextResponse.json({ universities });
}
