"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Target,
  BookOpen,
  ChevronRight,
  Sprout,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthSWR } from "@/lib/api/swr";
import type { University } from "@/lib/types/university";
import type { Activity } from "@/lib/types/activity";
import { EssayCoachChat } from "./EssayCoachChat";
import { SelfAnalysisReference } from "./SelfAnalysisReference";

type TabId = "coach" | "ap" | "neta" | "self";

interface EssayCoachPanelProps {
  topic: string;
  draft: string;
  universityId?: string;
  facultyId?: string;
}

const TAB_CONFIG: Array<{ id: TabId; label: string; Icon: typeof MessageSquare }> = [
  { id: "coach", label: "AIコーチ", Icon: MessageSquare },
  { id: "ap", label: "AP", Icon: Target },
  { id: "neta", label: "ネタ", Icon: BookOpen },
  { id: "self", label: "自己分析", Icon: Sprout },
];

export function EssayCoachPanel({
  topic,
  draft,
  universityId,
  facultyId,
}: EssayCoachPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* floating chatbot ボタン (画面左下、入力エリアを妨げない) */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 h-14 rounded-full shadow-lg cursor-pointer px-5 gap-2"
        aria-label="AIコーチを開く"
      >
        <MessageSquare className="size-5" />
        <span className="hidden sm:inline text-sm">AIコーチ</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-full p-0 sm:max-w-md lg:max-w-lg"
        >
          <SheetHeader className="border-b">
            <SheetTitle>執筆サポート</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            <PanelBody
              topic={topic}
              draft={draft}
              universityId={universityId}
              facultyId={facultyId}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PanelBody({
  topic,
  draft,
  universityId,
  facultyId,
}: EssayCoachPanelProps) {
  const [active, setActive] = useState<TabId>("coach");

  return (
    <Card className="flex flex-col h-full min-h-0 overflow-hidden rounded-xl">
      <div className="flex items-center gap-1 border-b p-2">
        {TAB_CONFIG.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
              active === id
                ? "bg-teal-500 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "coach" && (
          <EssayCoachChat
            topic={topic}
            draft={draft}
            universityId={universityId}
            facultyId={facultyId}
            resetKey={`${universityId ?? ""}:${facultyId ?? ""}:${topic}`}
          />
        )}
        {active === "ap" && (
          <APReference universityId={universityId} facultyId={facultyId} />
        )}
        {active === "neta" && <NetaReference />}
        {active === "self" && <SelfAnalysisReference />}
      </div>
    </Card>
  );
}

function APReference({
  universityId,
  facultyId,
}: {
  universityId?: string;
  facultyId?: string;
}) {
  const { data, isLoading } = useAuthSWR<University>(
    universityId ? `/api/universities/${universityId}` : null
  );

  if (!universityId || !facultyId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        志望校・学部が選択されていません。上部の志望校選択から選んでください。
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  const faculty = data?.faculties?.find((f) => f.id === facultyId);
  if (!faculty) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        学部情報が見つかりませんでした。
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">志望校・学部</div>
        <div className="text-sm font-semibold">
          {data?.name} {faculty.name}
        </div>
      </div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        アドミッション・ポリシー
      </div>
      {faculty.admissionPolicy ? (
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
          {faculty.admissionPolicy}
        </pre>
      ) : (
        <div className="text-sm text-muted-foreground">AP は登録されていません。</div>
      )}
    </div>
  );
}

function NetaReference() {
  const { data, isLoading } = useAuthSWR<{ activities: Activity[] }>(
    "/api/activities"
  );

  const activities = data?.activities ?? [];
  const sorted = [...activities].sort((a, b) => {
    const ha = a.structuredData ? 0 : 1;
    const hb = b.structuredData ? 0 : 1;
    return ha - hb;
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }
  if (sorted.length === 0) {
    return (
      <div className="p-4 text-sm">
        <p className="mb-2 text-muted-foreground">
          まだ活動実績が登録されていません。
        </p>
        <Link
          href="/student/activities/new"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          活動を追加する
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {sorted.map((a) => (
        <NetaCard key={a.id} activity={a} />
      ))}
    </div>
  );
}

function NetaCard({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false);
  const sd = activity.structuredData;
  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-3 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{activity.title}</div>
            <div className="text-xs text-muted-foreground">
              {activity.category} ・ {activity.period?.start}〜{activity.period?.end || "継続中"}
            </div>
          </div>
          {sd && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              構造化済
            </Badge>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t px-3 py-2 text-xs space-y-2">
          {sd ? (
            <>
              {sd.motivation && (
                <div>
                  <span className="font-semibold">動機:</span> {sd.motivation}
                </div>
              )}
              {sd.actions?.length > 0 && (
                <div>
                  <span className="font-semibold">行動:</span>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {sd.actions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sd.results?.length > 0 && (
                <div>
                  <span className="font-semibold">結果:</span>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {sd.results.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sd.learnings?.length > 0 && (
                <div>
                  <span className="font-semibold">学び:</span>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {sd.learnings.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sd.connection && (
                <div>
                  <span className="font-semibold">接続:</span> {sd.connection}
                </div>
              )}
            </>
          ) : (
            <div className="whitespace-pre-wrap text-muted-foreground">
              {activity.description || "(本文なし)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
