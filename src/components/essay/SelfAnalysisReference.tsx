"use client";

import Link from "next/link";
import { ChevronRight, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthSWR } from "@/lib/api/swr";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

interface SectionProps {
  title: string;
  hasContent: boolean;
  stepNum: number;
  children: React.ReactNode;
}

function Section({ title, hasContent, stepNum, children }: SectionProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Step {stepNum}
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        {!hasContent && (
          <Link
            href="/student/self-analysis"
            className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            入力する
            <ChevronRight className="size-3" />
          </Link>
        )}
      </div>
      {hasContent ? (
        <div className="text-xs space-y-1.5">{children}</div>
      ) : (
        <p className="text-xs text-muted-foreground">未入力</p>
      )}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v, i) => (
        <Badge
          key={i}
          variant="outline"
          className="text-[11px] font-normal"
        >
          {v}
        </Badge>
      ))}
    </div>
  );
}

export function SelfAnalysisReference() {
  const { data, isLoading } = useAuthSWR<SelfAnalysis | null>(
    "/api/self-analysis?userId=me"
  );

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (!data) {
    return (
      <div className="p-4 text-sm space-y-2">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Sprout className="size-4" />
          自己分析がまだ始まっていません。
        </p>
        <Link
          href="/student/self-analysis"
          className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
        >
          自己分析を始める
          <ChevronRight className="size-3" />
        </Link>
      </div>
    );
  }

  const v = data.values;
  const s = data.strengths;
  const w = data.weaknesses;
  const i = data.interests;
  const vi = data.vision;
  const id = data.identity;

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          進捗: {data.completedSteps}/7 ステップ
        </span>
        <Link
          href="/student/self-analysis"
          className="text-primary hover:underline"
        >
          続きをやる
        </Link>
      </div>

      <Section
        title="価値観"
        stepNum={1}
        hasContent={(v?.coreValues?.length ?? 0) > 0}
      >
        <Chips items={v?.coreValues ?? []} />
        {v?.valueOrigins && v.valueOrigins.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              原体験
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {v.valueOrigins.map((x, k) => (
                <li key={k}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section
        title="強み"
        stepNum={2}
        hasContent={(s?.strengths?.length ?? 0) > 0}
      >
        <Chips items={s?.strengths ?? []} />
        {s?.uniqueCombo && (
          <p className="mt-2 text-muted-foreground">{s.uniqueCombo}</p>
        )}
      </Section>

      <Section
        title="弱みと成長"
        stepNum={3}
        hasContent={(w?.weaknesses?.length ?? 0) > 0}
      >
        <Chips items={w?.weaknesses ?? []} />
        {w?.overcomeLessons && w.overcomeLessons.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              学び
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {w.overcomeLessons.map((x, k) => (
                <li key={k}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section
        title="興味分野"
        stepNum={4}
        hasContent={(i?.fields?.length ?? 0) > 0}
      >
        <Chips items={i?.fields ?? []} />
      </Section>

      <Section
        title="将来ビジョン"
        stepNum={5}
        hasContent={Boolean(vi?.longTermVision)}
      >
        {vi?.longTermVision && (
          <p className="whitespace-pre-wrap">{vi.longTermVision}</p>
        )}
      </Section>

      <Section
        title="自己宣言"
        stepNum={7}
        hasContent={Boolean(id?.selfStatement)}
      >
        {id?.selfStatement && (
          <p className="whitespace-pre-wrap">{id.selfStatement}</p>
        )}
      </Section>
    </div>
  );
}
