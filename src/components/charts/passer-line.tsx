import { Line } from "recharts";
import {
  benchmarkAt,
  monthsSince,
  type PasserBenchmarkView,
} from "@/lib/benchmark/passer-benchmark";

/**
 * 合格者ライン（志望校の段の合格者が、書き始めから同じ月数のときに取っていた点）。
 * 小論文の合計点（50点換算）のグラフに重ねる。行ごとに passer 列を持たせて描く。
 */

/** その答案の時刻での合格者の点。ラインが無い・時刻が分からなければ undefined */
export function passerValueAt(
  benchmark: PasserBenchmarkView | null | undefined,
  ts: number | undefined
): number | undefined {
  if (!benchmark || benchmark.startAt === null || !Number.isFinite(ts)) return undefined;
  return benchmarkAt(benchmark, monthsSince(benchmark.startAt, ts!));
}

/**
 * 破線の Line。Recharts は子要素の型を見て描くので、コンポーネントにせず要素を返す。
 */
export function passerLine(benchmark: PasserBenchmarkView) {
  return (
    <Line
      key="passer"
      type="stepAfter"
      dataKey="passer"
      name={`${benchmark.label} 合格者`}
      stroke="var(--muted-foreground)"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      dot={false}
      activeDot={false}
      connectNulls
      isAnimationActive={false}
    />
  );
}
