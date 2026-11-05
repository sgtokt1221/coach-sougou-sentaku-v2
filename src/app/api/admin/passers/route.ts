import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  passerIso,
  visiblePassers,
} from "@/lib/passers/passer-access";
import { normalizedEssayTotal } from "@/lib/types/essay";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "@/lib/skill-check/aggregate";

/**
 * GET /api/admin/passers
 * 呼び出した人が見られる合格者の一覧（同じ塾の管理者・講師、本部は全員）。
 * 名前は同じ塾の人にだけ返す。
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ["admin", "teacher", "superadmin"]);
  if (auth instanceof NextResponse) return auth;
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const passers = await visiblePassers(adminDb, auth);
    const rows = await Promise.all(
      passers.map(async (p) => {
        const [essaySnap, docs, interviewsSnap] = await Promise.all([
          adminDb!
            .collection("essays")
            .where("userId", "==", p.uid)
            .select("submittedAt", "scores.total", "feedback.scoreMaximum", "status", "reviewedAt")
            .get(),
          adminDb!
            .collection("documents")
            .where("userId", "==", p.uid)
            .select("type")
            .get(),
          adminDb!.collection("interviews").where("userId", "==", p.uid).get(),
        ]);
        const essayRows = essaySnap.docs.map((d) => d.data());
        // 推移（古い順・50点換算）。グラフと数値に使う
        const series = essayRows
          .filter((e) => e.status === "reviewed" && typeof e.scores?.total === "number")
          .map((e) => ({
            at: passerIso(e.submittedAt),
            score: normalizedEssayTotal(e.scores.total, e.feedback?.scoreMaximum),
          }))
          .filter((x): x is { at: string; score: number } => !!x.at)
          .sort((a, b) => a.at.localeCompare(b.at));
        const [essayAgg, interviewAgg] = await Promise.all([
          computeEssayAggregate(p.uid, essayRows),
          computeInterviewAggregate(
            p.uid,
            interviewsSnap.docs.map((d) => d.data())
          ),
        ]);
        return {
          uid: p.uid,
          name: p.name,
          label: p.label,
          passes: p.passes,
          essayCount: essaySnap.size,
          series,
          essayRank: essayAgg.compositeRank,
          essayScore: essayAgg.compositeScore,
          interviewRank: interviewAgg.compositeRank,
          interviewScore: interviewAgg.compositeScore,
          documentCount: docs.docs.filter((d) =>
            (PASSER_DOCUMENT_TYPES as readonly string[]).includes(d.get("type"))
          ).length,
        };
      })
    );
    return NextResponse.json({ passers: rows });
  } catch (error) {
    console.error("passers list error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
