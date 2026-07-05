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
  Sparkles,
  GraduationCap,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { SelfAnalysis } from "@/lib/types/self-analysis";

interface AnalysisResultCardProps {
  analysis: SelfAnalysis;
  onUpdate?: (updated: SelfAnalysis) => void;
  /** true で編集UI（鉛筆）を隠し、読み取り専用にする（管理者閲覧など） */
  readOnly?: boolean;
  /**
   * 各セクション（=自己分析ステップ）末尾に差し込む追加描画。
   * 管理者はコメント投稿＋承認トグル、生徒はコメント一覧＋承認バッジを描画する用途。
   */
  renderSectionExtra?: (sectionKey: EditableSection, sectionTitle: string) => React.ReactNode;
}

/** 編集内容を書き戻せる SelfAnalysis 上のセクション（オブジェクト型のフィールドのみ） */
type EditableSection =
  | "values"
  | "strengths"
  | "weaknesses"
  | "interests"
  | "vision"
  | "identity"
  | "synthesis";

interface FieldConfig {
  label: string;
  /** 編集内容を書き戻す SelfAnalysis 上のセクションキー */
  section: EditableSection;
  /** セクション内のフィールドキー */
  key: string;
  value: string | string[];
}

interface SectionConfig {
  title: string;
  /** セクション（=自己分析ステップ）のキー。コメント/承認の targetId に使う */
  section: EditableSection;
  icon: React.ReactNode;
  fields: FieldConfig[];
}

function EditableField({
  label,
  value,
  onSave,
  editable = true,
}: {
  label: string;
  value: string | string[];
  onSave: (val: string | string[]) => void;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const isArray = Array.isArray(value);
  const [draft, setDraft] = useState(isArray ? value.join("\n") : value);

  function handleSave() {
    onSave(isArray ? draft.split("\n").filter(Boolean) : draft);
    setEditing(false);
  }

  if (editing && editable) {
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
        {editable && (
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3" />
          </Button>
        )}
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
  readOnly = false,
  renderSectionExtra,
}: AnalysisResultCardProps) {
  // 未完了ステップは欠損していることがあるため全て null 安全に読む
  const v = analysis.values ?? ({} as SelfAnalysis["values"]);
  const st = analysis.strengths ?? ({} as SelfAnalysis["strengths"]);
  const w = analysis.weaknesses ?? ({} as SelfAnalysis["weaknesses"]);
  const it = analysis.interests ?? ({} as SelfAnalysis["interests"]);
  const vi = analysis.vision ?? ({} as SelfAnalysis["vision"]);
  const id = analysis.identity ?? ({} as SelfAnalysis["identity"]);
  const sy = analysis.synthesis ?? ({} as NonNullable<SelfAnalysis["synthesis"]>);

  const sections: SectionConfig[] = [
    {
      title: "価値観",
      section: "values",
      icon: <Heart className="size-4 text-rose-500" />,
      fields: [
        { label: "核となる価値観", section: "values", key: "coreValues", value: v.coreValues ?? [] },
        { label: "価値観の原体験", section: "values", key: "valueOrigins", value: v.valueOrigins ?? [] },
        { label: "優先順位", section: "values", key: "priorityOrder", value: v.priorityOrder ?? [] },
      ],
    },
    {
      title: "強み",
      section: "strengths",
      icon: <Zap className="size-4 text-amber-500" />,
      fields: [
        { label: "強み", section: "strengths", key: "strengths", value: st.strengths ?? [] },
        { label: "根拠・エビデンス", section: "strengths", key: "evidences", value: st.evidences ?? [] },
        { label: "強みの独自な組み合わせ", section: "strengths", key: "uniqueCombo", value: st.uniqueCombo ?? "" },
      ],
    },
    {
      title: "弱みと成長",
      section: "weaknesses",
      icon: <TrendingUp className="size-4 text-emerald-500" />,
      fields: [
        { label: "弱み", section: "weaknesses", key: "weaknesses", value: w.weaknesses ?? [] },
        { label: "成長エピソード", section: "weaknesses", key: "growthStories", value: w.growthStories ?? [] },
        { label: "克服から得た教訓", section: "weaknesses", key: "overcomeLessons", value: w.overcomeLessons ?? [] },
      ],
    },
    {
      title: "興味関心",
      section: "interests",
      icon: <BookOpen className="size-4 text-sky-500" />,
      fields: [
        { label: "興味のある分野", section: "interests", key: "fields", value: it.fields ?? [] },
        { label: "興味を持った理由", section: "interests", key: "reasons", value: it.reasons ?? [] },
        { label: "深掘りしたテーマ", section: "interests", key: "deepDiveTopics", value: it.deepDiveTopics ?? [] },
      ],
    },
    {
      title: "将来ビジョン",
      section: "vision",
      icon: <Telescope className="size-4 text-purple-500" />,
      fields: [
        { label: "短期目標", section: "vision", key: "shortTermGoal", value: vi.shortTermGoal ?? "" },
        { label: "長期ビジョン", section: "vision", key: "longTermVision", value: vi.longTermVision ?? "" },
        { label: "社会貢献", section: "vision", key: "socialContribution", value: vi.socialContribution ?? "" },
        { label: "この分野を選ぶ理由", section: "vision", key: "whyThisField", value: vi.whyThisField ?? "" },
      ],
    },
    {
      title: "アイデンティティ",
      section: "identity",
      icon: <User className="size-4 text-indigo-500" />,
      fields: [
        { label: "自己紹介文", section: "identity", key: "selfStatement", value: id.selfStatement ?? "" },
        { label: "自分ストーリー", section: "identity", key: "uniqueNarrative", value: id.uniqueNarrative ?? "" },
        { label: "AP接続ポイント", section: "identity", key: "apConnection", value: id.apConnection ?? "" },
      ],
    },
    {
      title: "統合・言語化",
      section: "synthesis",
      icon: <Sparkles className="size-4 text-red-500" />,
      fields: [
        { label: "自己紹介文", section: "synthesis", key: "selfStatement", value: sy.selfStatement ?? "" },
        { label: "自分ストーリー", section: "synthesis", key: "coreNarrative", value: sy.coreNarrative ?? "" },
      ],
    },
  ];

  // 大学・APとのまとめ（志望校ごと）。新形式 apSummaries 優先、旧 apSummary はフォールバック表示。
  const apSummaries = analysis.synthesis?.apSummaries ?? [];
  const legacyApSummary = analysis.synthesis?.apSummary;

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
                editable={!readOnly}
                onSave={(val) => {
                  if (!onUpdate) return;
                  const updated: SelfAnalysis = {
                    ...analysis,
                    [field.section]: {
                      ...((analysis[field.section] as unknown as Record<string, unknown>) ?? {}),
                      [field.key]: val,
                    },
                  };
                  onUpdate(updated);
                }}
              />
            ))}
            {renderSectionExtra && (
              <div className="border-t pt-3">
                {renderSectionExtra(section.section, section.title)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {(apSummaries.length > 0 || legacyApSummary) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="size-4 text-teal-600" />
              大学・APとのまとめ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {apSummaries.length > 0 ? (
              apSummaries.map((ap, i) => (
                <div key={i} className="space-y-1">
                  {(ap.universityName || ap.facultyName) && (
                    <p className="text-xs font-semibold text-foreground">
                      {ap.universityName}
                      {ap.facultyName ? ` ${ap.facultyName}` : ""}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{ap.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-relaxed">{legacyApSummary}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
