import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/auth";
import { normalizedEssayTotal } from "@/lib/types/essay";
import { AI_PROMPT_VERSIONS } from "@/lib/ai/prompt-versions";
import {
  PASSER_TIER_LABELS,
  median,
  type PasserTier,
} from "@/lib/benchmark/passer-benchmark";
import { loadPasserBenchmark } from "@/lib/benchmark/passer-benchmark-server";
import type {
  ScoringDriftResponse,
  ScoringVersionRow,
} from "@/lib/types/superadmin-analytics";

const DAYS = 180;

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * GET /api/superadmin/analytics/scoring
 * 直近180日の小論文の点（50点換算）を、採点の版ごとに並べる。
 * 版を上げて点の分布が動くと、合格者ラインの意味も全塾で同時に変わるため、
 * 合格者ラインを作ったときの版と並べて見せる。
 * 先生が点を直した答案は、元の AI の点（teacherEdits.score.aiScores）で数える。
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["superadmin"]);
  if (authResult instanceof NextResponse) return authResult;
  const { adminDb } = await import("@/lib/firebase/admin");
  if (!adminDb) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  try {
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
    const snap = await adminDb
      .collection("essays")
      .where("submittedAt", ">=", since)
      .select(
        "submittedAt",
        "scores.total",
        "feedback.scoreMaximum",
        "feedback.aiMetadata.promptVersion",
        "teacherEdits.score.aiScores.total"
      )
      .get();

    const byVersion = new Map<string, { scores: number[]; times: number[] }>();
    for (const d of snap.docs) {
      const x = d.data();
      const total =
        x.teacherEdits?.score?.aiScores?.total ?? x.scores?.total;
      if (typeof total !== "number") continue;
      const version: string = x.feedback?.aiMetadata?.promptVersion ?? "不明";
      const at: number | undefined = x.submittedAt?.toDate?.()?.getTime();
      const cur = byVersion.get(version) ?? { scores: [], times: [] };
      cur.scores.push(normalizedEssayTotal(total, x.feedback?.scoreMaximum));
      if (at) cur.times.push(at);
      byVersion.set(version, cur);
    }

    const versionNum = (v: string) => Number(v.match(/v(\d+)$/)?.[1] ?? -1);
    const rows: ScoringVersionRow[] = [...byVersion.entries()]
      .map(([version, { scores, times }]) => {
        const s = [...scores].sort((a, b) => a - b);
        return {
          version,
          count: s.length,
          mean: round1(s.reduce((a, b) => a + b, 0) / s.length),
          median: round1(median(s)),
          p25: round1(quantile(s, 0.25)),
          p75: round1(quantile(s, 0.75)),
          from: times.length ? new Date(Math.min(...times)).toISOString() : "",
          to: times.length ? new Date(Math.max(...times)).toISOString() : "",
        };
      })
      .sort((a, b) => versionNum(b.version) - versionNum(a.version));

    const benchmarks: ScoringDriftResponse["benchmarks"] = [];
    for (const tier of Object.keys(PASSER_TIER_LABELS) as PasserTier[]) {
      const b = await loadPasserBenchmark(adminDb, tier);
      if (b) {
        benchmarks.push({
          label: PASSER_TIER_LABELS[tier],
          level: b.level,
          promptVersion: b.promptVersion,
        });
      }
    }

    const body: ScoringDriftResponse = {
      currentVersion: AI_PROMPT_VERSIONS.essayReview.promptVersion,
      rows,
      benchmarks,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("scoring drift error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
