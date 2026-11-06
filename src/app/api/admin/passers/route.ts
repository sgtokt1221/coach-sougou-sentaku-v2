import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { adminDb } from "@/lib/firebase/admin";
import {
  PASSER_DOCUMENT_TYPES,
  passerIso,
  visiblePassers,
} from "@/lib/passers/passer-access";
import {
  ESSAY_SCORE_WEIGHTS,
  normalizedEssayTotal,
  type EssayScoreAxis,
} from "@/lib/types/essay";
import { normalizedInterviewTotal } from "@/lib/types/interview";
import { calculateRank } from "@/lib/skill-check/rank";
import {
  PASSER_RESCORE_DOC,
  loadPasserBenchmark,
  tierOfUniversity,
} from "@/lib/benchmark/passer-benchmark-server";
import {
  computeEssayAggregate,
  computeInterviewAggregate,
} from "@/lib/skill-check/aggregate";

/** ISO の日時を日本時間の「2026-09」にする */
function jstMonth(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
}

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
          ? (rescoreSnap.data() as {
              promptVersion: string;
              points: {
                at: string;
                score: number;
                axes?: Partial<Record<EssayScoreAxis, number>> | null;
              }[];
            })
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
        const tier =
          p.passes.map((x) => tierOfUniversity(x.universityName)).find(Boolean) ?? null;
        const [essayAgg, interviewAgg, benchmark] = await Promise.all([
          computeEssayAggregate(p.uid, essayRows),
          computeInterviewAggregate(
            p.uid,
            interviewsSnap.docs.map((d) => d.data())
          ),
          tier ? loadPasserBenchmark(adminDb!, tier) : null,
        ]);
        const series = (rescored?.points.length ? rescored.points : storedSeries).map(
          ({ at, score }) => ({ at, score })
        );
        // ランクの点は、付け直した点があればその直近10件の平均（生徒のランクと同じ件数）
        const recent = rescored?.points.slice(-10).map((x) => x.score) ?? [];
        const rescoredAvg = recent.length
          ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10
          : null;
        // 指標（軸）の平均。ランクと同じ直近10件・付け直した点だけ。値は配点の目盛り（構成なら12点中）
        const axisPoints = (rescored?.points.slice(-10) ?? []).filter((x) => x.axes);
        const axes = axisPoints.length
          ? (Object.keys(ESSAY_SCORE_WEIGHTS) as EssayScoreAxis[]).map((key) => {
              const vals = axisPoints
                .map((x) => x.axes?.[key])
                .filter((v): v is number => typeof v === "number");
              const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
              const max = ESSAY_SCORE_WEIGHTS[key];
              return { key, value: Math.round((avg / 10) * max * 10) / 10, max };
            })
          : null;
        // 面接の推移（40点換算・終わった回だけ）
        const interviews = interviewsSnap.docs
          .map((d) => d.data())
          .filter((x) => x.status === "completed" && typeof x.scores?.total === "number")
          .map((x) => ({
            at: passerIso(x.endedAt ?? x.completedAt ?? x.createdAt),
            score: Math.round(normalizedInterviewTotal(x.scores) * 10) / 10,
          }))
          .filter((x): x is { at: string; score: number } => !!x.at)
          .sort((a, b) => a.at.localeCompare(b.at));
        // 月ごとの提出数（小論文は提出した全件、面接は終わった回）
        const essayDates = essayRows
          .map((e) => passerIso(e.submittedAt))
          .filter((x): x is string => !!x)
          .sort();
        const months = new Map<string, { essays: number; interviews: number }>();
        const bump = (at: string, k: "essays" | "interviews") => {
          const ym = jstMonth(at);
          const m = months.get(ym) ?? { essays: 0, interviews: 0 };
          m[k]++;
          months.set(ym, m);
        };
        essayDates.forEach((at) => bump(at, "essays"));
        interviews.forEach((x) => bump(x.at, "interviews"));
        const monthly = [...months.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, c]) => ({ month, ...c }));
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
          axes,
          interviews,
          monthly,
          /** 合格ライン（50点換算）。グラフの破線 */
          passLine: benchmark?.level ?? null,
          startedAt: [essayDates[0], interviews[0]?.at].filter(Boolean).sort()[0] ?? null,
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
