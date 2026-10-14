import { FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DOCUMENT_DEFENSE_VERDICT_LABELS,
  type DocumentDefense,
  type DocumentDefenseVerdict,
} from "@/lib/types/interview";

const VERDICT_STYLE: Record<DocumentDefenseVerdict, string> = {
  held: "bg-emerald-600 text-white",
  shaky: "bg-amber-500 text-white",
  broke: "bg-rose-600 text-white",
};

const VERDICT_ORDER: DocumentDefenseVerdict[] = ["broke", "shaky", "held"];

/**
 * 書類を渡した個人面接の結果。面接官が突いた書類の一文ごとに、
 * 持ちこたえたか と 面接でこう補う を並べる（生徒の結果画面・管理者の面接詳細で共用）
 */
export function DocumentDefenseSection({
  defense,
  compact = false,
}: {
  defense: DocumentDefense;
  compact?: boolean;
}) {
  const { items } = defense;
  if (items.length === 0) return null;
  const multi = new Set(items.map((i) => i.documentTitle)).size > 1;
  const count = (v: DocumentDefenseVerdict) =>
    items.filter((i) => i.verdict === v).length;

  return (
    <Card
      className={
        compact
          ? "border shadow-none"
          : "border-0 bg-white/70 shadow-md backdrop-blur-sm"
      }
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg tracking-tight text-slate-800">
          <FileSearch className="size-5 text-slate-600" />
          突かれた書類の文
          <span className="ml-auto flex gap-1.5 text-xs font-medium">
            {VERDICT_ORDER.filter((v) => count(v) > 0).map((v) => (
              <span key={v} className={`rounded px-2 py-0.5 ${VERDICT_STYLE[v]}`}>
                {DOCUMENT_DEFENSE_VERDICT_LABELS[v]} {count(v)}
              </span>
            ))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${VERDICT_STYLE[item.verdict]}`}
              >
                {DOCUMENT_DEFENSE_VERDICT_LABELS[item.verdict]}
              </span>
              {multi && (
                <span className="text-muted-foreground text-xs">
                  {item.documentTitle}
                </span>
              )}
            </div>
            <p className="rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
              「{item.quote}」
            </p>
            <dl className="mt-3 grid gap-x-3 gap-y-2 text-sm leading-relaxed sm:grid-cols-[7rem_1fr]">
              <dt className="text-muted-foreground text-xs sm:pt-0.5">
                面接官の問い
              </dt>
              <dd className="text-slate-800">{item.asked}</dd>
              <dt className="text-muted-foreground text-xs sm:pt-0.5">
                答え
              </dt>
              <dd className="text-slate-800">{item.reason}</dd>
              <dt className="text-xs font-semibold text-sky-800 sm:pt-0.5">
                面接でこう補う
              </dt>
              <dd className="rounded-lg bg-sky-100 px-3 py-2 text-slate-900">
                {item.supplement}
              </dd>
            </dl>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
