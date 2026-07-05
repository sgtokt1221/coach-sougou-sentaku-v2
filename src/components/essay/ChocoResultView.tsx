"use client";

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import type { ChocoScores, ChocoFeedback, ChocoRole } from "@/lib/types/choco";
import { CHOCO_ROLE_LABELS } from "@/lib/types/choco";

export function ChocoResultView({
  scores, feedback, modelText, keyPoints, role,
}: {
  scores: ChocoScores;
  feedback: ChocoFeedback;
  modelText: string;
  keyPoints: string[];
  role: ChocoRole;
}) {
  const radarData = [
    { subject: "論理", value: scores.logic },
    { subject: "つながり", value: scores.coherence },
    { subject: "表現", value: scores.expression },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{scores.total}</span>
          <span className="text-muted-foreground text-sm">/ 50</span>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="80%">
              <PolarGrid gridType="polygon" stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} />
              <Radar name="スコア" dataKey="value" stroke="#2563eb" fill="#0ea5e9" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm leading-relaxed">{feedback.overall}</p>
        <List title="よかった点" items={feedback.goodPoints} color="text-emerald-600" />
        <List title="もう一歩" items={feedback.improvements} color="text-amber-600" />
        <p className="text-sm"><span className="font-medium">次の一手：</span>{feedback.nextTip}</p>
      </div>

      {feedback.languageCorrections.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium">赤ペン</h3>
          {feedback.languageCorrections.map((c, i) => (
            <div key={i} className="text-sm">
              <span className="line-through text-rose-600">{c.original}</span>
              {" → "}
              <span className="text-emerald-600">{c.suggestion}</span>
              <span className="text-muted-foreground">（{c.reason}）</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-medium">模範（{CHOCO_ROLE_LABELS[role]}の段落）</h3>
        <p className="text-sm leading-relaxed">{modelText}</p>
        <h4 className="text-xs font-medium pt-2">この段落で押さえたい背景知識</h4>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {keyPoints.map((k, i) => <li key={i}>{k}</li>)}
        </ul>
      </div>
    </div>
  );
}

function List({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className={`text-sm font-medium ${color}`}>{title}</h3>
      <ul className="list-disc pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
