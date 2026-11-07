import { LabelList, Line } from "recharts";
import {
  passerColumnOf,
  type PasserBenchmarkView,
} from "@/lib/benchmark/passer-benchmark";

/**
 * 合格者ライン（各段の合格者が、書き始めから同じ月数のときに取っていた点）。
 * 小論文の合計点（50点換算）のグラフに重ねる。行ごとに passer_{段} の列を持たせて描く
 * （passerColumnsAt）。線はどれも同じ破線なので、右端に段の名前を直接書いて見分ける。
 *
 * Recharts は子要素の型を見て描くので、コンポーネントにせず要素の配列を返す。
 */
export function passerLines(views: PasserBenchmarkView[], rows: readonly object[]) {
  const valueOf = (i: number, key: string) =>
    (rows[i] as Record<string, unknown> | undefined)?.[key];
  const columns = views
    .map((view) => {
      const key = passerColumnOf(view.tier);
      const lastIndex = rows.findLastIndex((_, i) => typeof valueOf(i, key) === "number");
      return { view, key, lastIndex };
    })
    .filter((c) => c.lastIndex >= 0);
  // 右端で値の高い順に、名前を線の上・下と交互に置く（近い線どうしで重ならないように）
  const order = [...columns].sort(
    (a, b) =>
      Number(valueOf(b.lastIndex, b.key)) - Number(valueOf(a.lastIndex, a.key))
  );

  return columns.map(({ view, key, lastIndex }) => {
    const above = order.findIndex((c) => c.key === key) % 2 === 0;
    return (
      <Line
        key={key}
        type="stepAfter"
        dataKey={key}
        name={`${view.label} 合格者`}
        legendType="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        dot={false}
        activeDot={false}
        connectNulls
        isAnimationActive={false}
      >
        <LabelList
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) =>
            props.index === lastIndex ? (
              <text
                x={props.x}
                y={props.y + (above ? -5 : 13)}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted-foreground)"
                stroke="var(--background)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {view.label}
              </text>
            ) : null
          }
        />
      </Line>
    );
  });
}
