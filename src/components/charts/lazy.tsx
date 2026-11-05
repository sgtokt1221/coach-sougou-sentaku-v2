"use client";

/**
 * グラフ部品を、使う画面が表示されてから読み込む版（next/dynamic）。
 *
 * グラフのライブラリ（recharts）は大きく、よく開く画面（生徒のダッシュボード・成長、
 * 管理者のダッシュボード・生徒詳細）が最初の読み込みでまとめて読んでいた。
 * ここから import すると、画面の骨組みが先に出て、グラフは後から差し込まれる。
 * 読み込み中は同じ大きさの枠（光が流れる Skeleton）を出す。
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const box = (h: number) =>
  function ChartLoading() {
    return <Skeleton className="w-full rounded-xl" style={{ height: h }} />;
  };

export const ScoresTrendChart = dynamic(
  () => import("@/components/growth/ScoresTrendChart").then((m) => m.ScoresTrendChart),
  { ssr: false, loading: box(260) }
);

export const DetailedScoresTrendChart = dynamic(
  () =>
    import("@/components/growth/DetailedScoresTrendChart").then(
      (m) => m.DetailedScoresTrendChart
    ),
  { ssr: false, loading: box(300) }
);

export const StudentSkillRadar = dynamic(
  () => import("@/components/admin/StudentSkillRadar").then((m) => m.StudentSkillRadar),
  { ssr: false, loading: box(240) }
);

export const CategoryAverageRadar = dynamic(
  () =>
    import("@/components/admin/CategoryAverageRadar").then((m) => m.CategoryAverageRadar),
  { ssr: false, loading: box(240) }
);

export const ActivityHeatmap = dynamic(
  () => import("@/components/admin/ActivityHeatmap").then((m) => m.ActivityHeatmap),
  { ssr: false, loading: box(160) }
);

export const StudentStatusPie = dynamic(
  () => import("@/components/admin/StudentStatusPie").then((m) => m.StudentStatusPie),
  { ssr: false, loading: box(220) }
);

export const ReportDetailCard = dynamic(
  () => import("@/components/admin/ReportDetailCard").then((m) => m.ReportDetailCard),
  { ssr: false, loading: box(200) }
);

export const SkillRadarChart = dynamic(
  () => import("@/components/skill-check/SkillRadarChart").then((m) => m.SkillRadarChart),
  { ssr: false, loading: box(220) }
);
