import {
  calculateDocumentTotal,
  DOCUMENT_SCORE_LABELS,
  DOCUMENT_SCORE_WEIGHTS,
  type DocumentScoreAxis,
} from "@/lib/types/document";
import { axisPoints, getRankFromPercentage, getRankInfo } from "@/lib/score-rank";

/**
 * 書類の総合点とランク。一覧・詳細・生徒画面で同じ換算・同じ見え方にする。
 *
 * 軸ごとの点だけだと「この書類は結局どうなのか」が読み取れず、書類同士の
 * 比較もできなかった。合計と判定（S〜F）を1か所で出す。
 */

export interface DocumentScoreInput {
  apAlignment?: number | null;
  structure?: number | null;
  originality?: number | null;
  expression?: number | null;
}

/** ランクの色。一覧と詳細で同じ見え方にするため文字色だけ使う */
function rankTextClass(rank: string): string {
  switch (rank) {
    case "S":
      return "text-amber-600 dark:text-amber-400";
    case "A":
      return "text-purple-600 dark:text-purple-400";
    case "B":
      return "text-sky-600 dark:text-sky-400";
    case "C":
      return "text-emerald-600 dark:text-emerald-400";
    case "D":
      return "text-amber-700 dark:text-amber-500";
    default:
      return "text-rose-600 dark:text-rose-400";
  }
}

/** 一覧の1セルに収まる小さい表示。総合点とランクだけ */
export function DocumentTotalScoreInline({
  scores,
}: {
  scores: DocumentScoreInput;
}) {
  const { total, max, percentage, missing } = calculateDocumentTotal(scores);
  if (max === 0) {
    return <span className="text-muted-foreground text-xs">未添削</span>;
  }
  const rank = getRankFromPercentage(percentage);

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-sm font-semibold tabular-nums">
        {total}
        <span className="text-muted-foreground text-xs">/{max}</span>
      </span>
      <span className={`text-sm font-bold ${rankTextClass(rank)}`}>{rank}</span>
      {missing.includes("apAlignment") && (
        <span className="text-muted-foreground text-[10px]">AP未評価</span>
      )}
    </span>
  );
}

/** 詳細画面用。総合点・ランク・その意味あいと、軸ごとの内訳 */
export function DocumentTotalScoreCard({
  scores,
}: {
  scores: DocumentScoreInput;
}) {
  const { total, max, percentage, missing } = calculateDocumentTotal(scores);
  if (max === 0) return null;
  const rank = getRankFromPercentage(percentage);
  const info = getRankInfo(rank);
  const axes = Object.keys(DOCUMENT_SCORE_WEIGHTS) as DocumentScoreAxis[];

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline gap-3">
        <div className="tabular-nums">
          <span className="text-3xl font-bold">{total}</span>
          <span className="text-muted-foreground text-sm">/{max}</span>
        </div>
        <div className={`text-2xl font-bold ${rankTextClass(rank)}`}>{rank}</div>
        <div className="text-muted-foreground text-xs">
          {info.label}・{info.description}
        </div>
      </div>

      {missing.length > 0 && (
        <p className="text-muted-foreground mt-1 text-[11px]">
          {missing.map((a) => DOCUMENT_SCORE_LABELS[a]).join("・")}
          は採点していないため、満点から除いています
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {axes.map((axis) => {
          const value = scores[axis];
          return (
            <div key={axis} className="text-xs">
              <div className="text-muted-foreground">{DOCUMENT_SCORE_LABELS[axis]}</div>
              <div className="tabular-nums">
                {typeof value === "number" ? (
                  <>
                    <span className="text-lg font-semibold">
                      {axisPoints(value, DOCUMENT_SCORE_WEIGHTS[axis]).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      /{DOCUMENT_SCORE_WEIGHTS[axis]}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">未評価</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
