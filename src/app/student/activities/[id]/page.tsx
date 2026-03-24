"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Target,
  Lightbulb,
  Trophy,
  BookOpen,
  Link2,
} from "lucide-react";
import type { Activity, ActivityOptimization } from "@/lib/types/activity";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/types/activity";

const mockUniversities = [
  {
    id: "kyoto-u",
    name: "京都大学",
    faculties: [
      { id: "letters", name: "文学部" },
      { id: "law", name: "法学部" },
    ],
  },
  {
    id: "osaka-u",
    name: "大阪大学",
    faculties: [
      { id: "letters", name: "文学部" },
      { id: "law", name: "法学部" },
    ],
  },
  {
    id: "tohoku-u",
    name: "東北大学",
    faculties: [
      { id: "arts-letters", name: "文学部" },
      { id: "law", name: "法学部" },
    ],
  },
];

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);

  // Optimize state
  const [selectedUni, setSelectedUni] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizations, setOptimizations] = useState<ActivityOptimization[]>([]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activities/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setActivity(data.activity);
        setDescription(data.activity.description);
        setOptimizations(data.activity.optimizations ?? []);
      } catch {
        setActivity(null);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [id]);

  const selectedUniData = mockUniversities.find((u) => u.id === selectedUni);
  const faculties = selectedUniData?.faculties ?? [];

  async function handleOptimize() {
    if (!selectedUni || !selectedFaculty) return;
    const uni = mockUniversities.find((u) => u.id === selectedUni);
    const fac = uni?.faculties.find((f) => f.id === selectedFaculty);
    if (!uni || !fac) return;

    setOptimizing(true);
    try {
      const res = await fetch(`/api/activities/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: uni.id,
          facultyId: fac.id,
          universityName: uni.name,
          facultyName: fac.name,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOptimizations((prev) => [...prev, data.optimization]);
    } catch {
      // Fallback mock
      setOptimizations((prev) => [
        ...prev,
        {
          universityId: uni.id,
          facultyId: fac.id,
          universityName: uni.name,
          facultyName: fac.name,
          optimizedText: `${uni.name}${fac.name}向けに最適化されたテキストです。主体性と探求心をアピールする表現に調整しています。`,
          alignmentScore: 7,
          keyApKeywords: ["主体性", "探求心"],
          generatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setOptimizing(false);
      setSelectedUni("");
      setSelectedFaculty("");
    }
  }

  async function handleDescriptionSave() {
    setEditingDesc(false);
    try {
      await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-40 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 text-center text-muted-foreground">
        活動実績が見つかりません。
      </div>
    );
  }

  const structured = activity.structuredData;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/student/activities")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">{activity.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {ACTIVITY_CATEGORY_LABELS[activity.category]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {activity.period.start} ~ {activity.period.end || "現在"}
            </span>
          </div>
        </div>
      </div>

      {/* Structured data */}
      {structured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">構造化データ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Target className="size-4 mt-0.5 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">動機</p>
                <p className="text-sm">{structured.motivation}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="size-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">行動</p>
                <ul className="text-sm space-y-0.5">
                  {structured.actions.map((a, i) => (
                    <li key={i}>- {a}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Trophy className="size-4 mt-0.5 text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">成果</p>
                <ul className="text-sm space-y-0.5">
                  {structured.results.map((r, i) => (
                    <li key={i}>- {r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="size-4 mt-0.5 text-purple-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">学び</p>
                <ul className="text-sm space-y-0.5">
                  {structured.learnings.map((l, i) => (
                    <li key={i}>- {l}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Link2 className="size-4 mt-0.5 text-teal-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">大学・将来との接続</p>
                <p className="text-sm">{structured.connection}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">説明</CardTitle>
          {!editingDesc ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingDesc(true)}>
              編集
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleDescriptionSave}>
              保存
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingDesc ? (
            <textarea
              className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{description}</p>
          )}
        </CardContent>
      </Card>

      {/* AP Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4" />
            AP別最適化
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">大学</Label>
              <Select
                value={selectedUni}
                onValueChange={(v) => {
                  setSelectedUni(v ?? "");
                  setSelectedFaculty("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="大学を選択" />
                </SelectTrigger>
                <SelectContent>
                  {mockUniversities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">学部</Label>
              <Select
                value={selectedFaculty}
                onValueChange={(v) => setSelectedFaculty(v ?? "")}
                disabled={!selectedUni}
              >
                <SelectTrigger>
                  <SelectValue placeholder="学部を選択" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleOptimize}
              disabled={!selectedUni || !selectedFaculty || optimizing}
              size="sm"
            >
              {optimizing ? <Loader2 className="size-4 animate-spin" /> : "最適化"}
            </Button>
          </div>

          {optimizations.length > 0 && <Separator />}

          {optimizations.map((opt, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">
                    {opt.universityName} {opt.facultyName}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    AP合致度: {opt.alignmentScore}/10
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">最適化テキスト</p>
                  <p className="text-sm">{opt.optimizedText}</p>
                </div>
                {opt.keyApKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {opt.keyApKeywords.map((kw, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {optimizations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              大学・学部を選択して「最適化」をクリックすると、AP向けの表現が生成されます。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
