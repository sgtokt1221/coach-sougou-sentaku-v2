"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, BookOpen } from "lucide-react";
import { TutorialDriver } from "@/components/tutorial/TutorialDriver";
import { DEMO_STEPS } from "@/lib/tutorial/demo-steps";

const FACULTIES = [
  { name: "総合政策学部", count: 24, color: "from-sky-50 to-blue-50" },
  { name: "法学部", count: 18, color: "from-amber-50 to-orange-50" },
  { name: "経済学部", count: 22, color: "from-emerald-50 to-green-50" },
  { name: "医学部", count: 15, color: "from-rose-50 to-pink-50" },
];

const SAMPLE_TOPIC = {
  title: "AIと雇用 — 自動化時代の労働市場",
  field: "経済・社会",
  background:
    "生成AI普及により、ホワイトカラー職の一部が自動化のリスクに晒されている。2023年OECD報告書は先進国で27%の職がAI影響下にあると推計。",
  arguments: [
    "賛成派: 新しい職種が生まれ、生産性向上で全体の賃金が上昇する",
    "反対派: 移行期に中間層が崩れ、格差が拡大する",
  ],
};

export default function DemoTopicInputPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ネタインプット</h1>
        <p className="text-sm text-muted-foreground">
          志望学部の頻出テーマを事前にストックしておけます
        </p>
      </div>

      <Card data-tour="topic-faculty" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-violet-500" />
            学部から選ぶ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {FACULTIES.map((f) => (
              <div
                key={f.name}
                className={`rounded-xl bg-gradient-to-br p-4 ${f.color}`}
              >
                <p className="text-sm font-bold">{f.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.count}件のネタ
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-tour="topic-card" className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4" />
            ネタ詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <p className="text-lg font-bold">{SAMPLE_TOPIC.title}</p>
            <Badge variant="outline">{SAMPLE_TOPIC.field}</Badge>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              背景
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {SAMPLE_TOPIC.background}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              論点
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {SAMPLE_TOPIC.arguments.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-primary/50 bg-muted/20 p-2"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <TutorialDriver step={DEMO_STEPS["topic-input"]} />
    </div>
  );
}
