"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  Zap,
  TrendingUp,
  BookOpen,
  Telescope,
  User,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

interface AnalysisResultCardProps {
  analysis: SelfAnalysis;
  onUpdate?: (updated: SelfAnalysis) => void;
}

interface SectionConfig {
  title: string;
  icon: React.ReactNode;
  fields: { label: string; value: string | string[] }[];
}

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | string[];
  onSave: (val: string | string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isArray = Array.isArray(value);
  const [draft, setDraft] = useState(isArray ? value.join("\n") : value);

  function handleSave() {
    onSave(isArray ? draft.split("\n").filter(Boolean) : draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleSave}>
            <Check className="size-3 mr-1" />
            保存
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(isArray ? value.join("\n") : value);
              setEditing(false);
            }}
          >
            <X className="size-3 mr-1" />
            取消
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3" />
        </Button>
      </div>
      {isArray ? (
        <ul className="text-sm space-y-1 mt-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-muted-foreground">-</span> {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm mt-1">{value}</p>
      )}
    </div>
  );
}

export function AnalysisResultCard({
  analysis,
  onUpdate,
}: AnalysisResultCardProps) {
  const sections: SectionConfig[] = [
    {
      title: "価値観",
      icon: <Heart className="size-4 text-rose-500" />,
      fields: [
        { label: "核となる価値観", value: analysis.values.coreValues },
        { label: "価値観の原体験", value: analysis.values.valueOrigins },
        { label: "優先順位", value: analysis.values.priorityOrder },
      ],
    },
    {
      title: "強み",
      icon: <Zap className="size-4 text-amber-500" />,
      fields: [
        { label: "強み", value: analysis.strengths.strengths },
        { label: "根拠・エビデンス", value: analysis.strengths.evidences },
        { label: "強みの独自な組み合わせ", value: analysis.strengths.uniqueCombo },
      ],
    },
    {
      title: "弱みと成長",
      icon: <TrendingUp className="size-4 text-emerald-500" />,
      fields: [
        { label: "弱み", value: analysis.weaknesses.weaknesses },
        { label: "成長エピソード", value: analysis.weaknesses.growthStories },
        { label: "克服から得た教訓", value: analysis.weaknesses.overcomeLessons },
      ],
    },
    {
      title: "興味関心",
      icon: <BookOpen className="size-4 text-blue-500" />,
      fields: [
        { label: "興味のある分野", value: analysis.interests.fields },
        { label: "興味を持った理由", value: analysis.interests.reasons },
        { label: "深掘りしたテーマ", value: analysis.interests.deepDiveTopics },
      ],
    },
    {
      title: "将来ビジョン",
      icon: <Telescope className="size-4 text-purple-500" />,
      fields: [
        { label: "短期目標", value: analysis.vision.shortTermGoal },
        { label: "長期ビジョン", value: analysis.vision.longTermVision },
        { label: "社会貢献", value: analysis.vision.socialContribution },
        { label: "この分野を選ぶ理由", value: analysis.vision.whyThisField },
      ],
    },
    {
      title: "アイデンティティ",
      icon: <User className="size-4 text-indigo-500" />,
      fields: [
        { label: "自己紹介文", value: analysis.identity.selfStatement },
        { label: "自分ストーリー", value: analysis.identity.uniqueNarrative },
        { label: "AP接続ポイント", value: analysis.identity.apConnection },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <EditableField
                key={field.label}
                label={field.label}
                value={field.value}
                onSave={() => {
                  // In production, would update specific fields
                  if (onUpdate) onUpdate(analysis);
                }}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
