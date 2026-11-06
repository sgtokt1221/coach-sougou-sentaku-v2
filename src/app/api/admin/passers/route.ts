import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  passerIso,
  visiblePassers,
} from "@/lib/passers/passer-access";
import { normalizedEssayTotal } from "@/lib/types/essay";
import { calculateRank } from "@/lib/skill-check/rank";
import { PASSER_RESCORE_DOC } from "@/lib/benchmark/passer-benchmark-server";
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
        const [essaySnap, docs, interviewsSnap, rescoreSnap] = await Promise.all([
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
          adminDb!.doc(`users/${p.uid}/${PASSER_RESCORE_DOC}`).get(),
        ]);
        /**
         * 合格ラインと同じ物差し（今の採点で付け直した点）があればそれを出す。
         * 提出当時の点は採点の版が古く、合格ラインと並べると話が合わない。
         */
        const rescored = rescoreSnap.exists
          ? (rescoreSnap.data() as { promptVersion: string; points: { at: string; score: number }[] })
          : null;
        const essayRows = essaySnap.docs.map((d) => d.data());
        // 推移（古い順・50点換算）。グラフと数値に使う
        const storedSeries = essayRows
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
        const series = rescored?.points.length ? rescored.points : storedSeries;
        // ランクの点は、付け直した点があればその直近10件の平均（生徒のランクと同じ件数）
        const recent = rescored?.points.slice(-10).map((x) => x.score) ?? [];
        const rescoredAvg = recent.length
          ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10
          : null;
        return {
          uid: p.uid,
          scoredWith: rescored?.promptVersion ?? null,
          name: p.name,
          label: p.label,
          passes: p.passes,
          essayCount: essaySnap.size,
          series,
          essayRank: rescoredAvg !== null ? calculateRank(rescoredAvg) : essayAgg.compositeRank,
          essayScore: rescoredAvg ?? essayAgg.compositeScore,
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
