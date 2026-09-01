"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Target,
  BookOpen,
  ChevronRight,
  Sprout,
  FileText,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileSlideOverPanel } from "@/components/shared/MobileSlideOverPanel";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthSWR } from "@/lib/api/swr";
import type { University } from "@/lib/types/university";
import type { CoachRequestBody } from "@/lib/types/essay-coach";
import { EssayCoachChat } from "./EssayCoachChat";
import { SelfAnalysisReference } from "./SelfAnalysisReference";
import { APReference } from "@/components/coach/APReference";
import { ReportSourcePane } from "@/components/essay/ReportSourcePane";
import { PastQuestionChart } from "./PastQuestionChart";
import type {
  FacultyTopic,
  FacultyTopicData,
} from "@/data/faculty-topics/types";
import {
  FACULTY_REGISTRY,
  FACULTY_CATEGORY_LABELS,
  type FacultyCategory,
  type FacultyEntry,
} from "@/data/faculty-topics/registry";
import { stripHighlights } from "@/lib/topics/highlightParser";
import { lawTopics } from "@/data/faculty-topics/law";
import { economicsTopics } from "@/data/faculty-topics/economics";
import { medicineTopics } from "@/data/faculty-topics/medicine";
import { nursingTopics } from "@/data/faculty-topics/nursing";
import { informaticsTopics } from "@/data/faculty-topics/informatics";
import { engineeringTopics } from "@/data/faculty-topics/engineering";
import { educationTopics } from "@/data/faculty-topics/education";
import { psychologyTopics } from "@/data/faculty-topics/psychology";
import { internationalTopics } from "@/data/faculty-topics/international";
import { sociologyTopics } from "@/data/faculty-topics/sociology";
import { businessTopics } from "@/data/faculty-topics/business";
import { humanitiesTopics } from "@/data/faculty-topics/humanities";
import { scienceTopics } from "@/data/faculty-topics/science";
import { agricultureTopics } from "@/data/faculty-topics/agriculture";
import { pharmacyTopics } from "@/data/faculty-topics/pharmacy";
import { artSportsTopics } from "@/data/faculty-topics/art-sports";

/** Faculty.academicField から学部別ネタインプットの登録IDへのマッピング */
const ACADEMIC_FIELD_TO_TOPIC_FACULTY: Record<string, string> = {
  law: "law",
  economics: "economics",
  business: "business",
  humanities: "humanities",
  medicine: "medicine",
  nursing: "nursing",
  science: "science",
  agriculture: "agriculture",
  engineering: "engineering",
};

/** topic-input 学部ID → 静的データ */
const FACULTY_TOPIC_DATA: Record<string, FacultyTopicData> = {
  law: lawTopics,
  economics: economicsTopics,
  medicine: medicineTopics,
  nursing: nursingTopics,
  informatics: informaticsTopics,
  engineering: engineeringTopics,
  education: educationTopics,
  psychology: psychologyTopics,
  international: internationalTopics,
  sociology: sociologyTopics,
  business: businessTopics,
  humanities: humanitiesTopics,
  science: scienceTopics,
  agriculture: agricultureTopics,
  pharmacy: pharmacyTopics,
  "art-sports": artSportsTopics,
};

type TabId = "reference" | "coach" | "ap" | "neta" | "self";

// PastQuestionChart の chart data type (既存モデルに合わせる、詳細は chart コンポーネントに委ねる)
type PastQuestionChartData = Parameters<typeof PastQuestionChart>[0]["charts"];

export interface ReferenceMaterial {
  sourceText?: string;
  chartData?: PastQuestionChartData;
  questionType?: CoachRequestBody["questionType"];
}

interface EssayCoachPanelProps {
  topic: string;
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** 過去問の参考資料 (あれば 資料 タブが先頭に追加され、コーチにも渡る) */
  referenceMaterial?: ReferenceMaterial;
  /**
   * 資料タブを増やさずにコーチにだけ渡す出題資料。
   * 課題文を画面の別の場所に出している画面 (レポート課題の ReportSourcePane) で使う。
   */
  coachMaterial?: ReferenceMaterial;
  /**
   * レポート課題の課題文と設問。渡すと「課題文」タブが先頭に付く。
   * 入力欄の上に置いていたときは、書きながら設問を見返すのに
   * 画面を大きくさかのぼる必要があった。AP・ネタと同じ場所に集める。
   */
  reportMaterial?: {
    title: string;
    question: string;
    body: string;
    recommendedWordLimit: number;
  };
  /**
   * 会話をリセットする単位。既定は topic だが、同じテーマ名で設問が変わる画面
   * (ちょこ添削の空欄切り替えなど) では設問を一意に識別する値を渡すこと。
   */
  conversationKey?: string;
  /** 会話スレッドIDの通知。提出時に答案へ保存するために親へ渡す */
  onThreadChange?: (threadId: string | null) => void;
}

function resolveReferenceLabel(material: ReferenceMaterial | undefined): {
  label: string;
  Icon: typeof MessageSquare;
} {
  const qt = material?.questionType;
  const hasText = Boolean(material?.sourceText);
  const hasChart = Boolean(
    material?.chartData && material.chartData.length > 0
  );
  if (qt === "english-reading" || (hasText && !hasChart)) {
    return { label: "英文", Icon: FileText };
  }
  if (qt === "data-analysis" || (hasChart && !hasText)) {
    return { label: "グラフ", Icon: BarChart3 };
  }
  return { label: "資料", Icon: FileText };
}

interface TabDef {
  id: TabId;
  label: string;
  Icon: typeof MessageSquare;
}

function buildPrimaryTabs(
  hasReference: boolean,
  reference: ReferenceMaterial | undefined,
  hasReport: boolean
): TabDef[] {
  // 主要タブ (大きく表示): 資料 vs AIコーチ の選択
  if (hasReport) {
    return [
      { id: "reference", label: "課題文", Icon: FileText },
      { id: "coach", label: "AIコーチ", Icon: MessageSquare },
    ];
  }
  if (hasReference) {
    const ref = resolveReferenceLabel(reference);
    return [
      { id: "reference", label: ref.label, Icon: ref.Icon },
      { id: "coach", label: "AIコーチ", Icon: MessageSquare },
    ];
  }
  return [{ id: "coach", label: "AIコーチ", Icon: MessageSquare }];
}

const SECONDARY_TABS: TabDef[] = [
  { id: "ap", label: "AP", Icon: Target },
  { id: "neta", label: "ネタ", Icon: BookOpen },
  { id: "self", label: "自己分析", Icon: Sprout },
];

export function EssayCoachPanel(props: EssayCoachPanelProps) {
  return (
    <>
      {/* デスクトップ: 左列として常設 (2 カラムレイアウトの左) */}
      <div className="hidden lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:flex-col">
        <EssayCoachPanelBody {...props} />
      </div>

      {/* モバイル: 覗きモード(背景暗転なし)で後ろの小論文入力欄を操作しながら参照できる */}
      <MobileSlideOverPanel label="執筆サポート" title="執筆サポート">
        <EssayCoachPanelBody {...props} />
      </MobileSlideOverPanel>
    </>
  );
}

export function EssayCoachPanelBody({
  topic,
  draft,
  universityId,
  facultyId,
  referenceMaterial,
  coachMaterial,
  reportMaterial,
  conversationKey,
  onThreadChange,
}: EssayCoachPanelProps) {
  // 資料タブは referenceMaterial だけで決める。coachMaterial はコーチにのみ渡す。
  const materialForCoach = referenceMaterial ?? coachMaterial;
  const hasReference = Boolean(
    referenceMaterial?.sourceText ||
    (referenceMaterial?.chartData && referenceMaterial.chartData.length > 0)
  );
  const primaryTabs = buildPrimaryTabs(
    hasReference,
    referenceMaterial,
    Boolean(reportMaterial)
  );
  const [active, setActive] = useState<TabId>(
    hasReference || reportMaterial ? "reference" : "coach"
  );

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
      {/* 主要タブ (大きく表示) 資料 ↔ AIコーチ */}
      <div className="bg-muted/30 flex items-center gap-1 border-b p-1.5">
        {primaryTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              active === id
                ? "bg-teal-500 text-white shadow-sm"
                : "text-foreground hover:bg-background/60"
            }`}
          >
            <Icon className="size-4" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* 副次タブ (小さく) AP / ネタ / 自己分析 */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {SECONDARY_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              active === id
                ? "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-3" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {active === "reference" && reportMaterial && (
          <ReportSourcePane
            title={reportMaterial.title}
            question={reportMaterial.question}
            body={reportMaterial.body}
            wordLimit={reportMaterial.recommendedWordLimit}
          />
        )}
        {active === "reference" && !reportMaterial && hasReference && (
          <ReferenceReference material={referenceMaterial!} />
        )}
        {active === "coach" && (
          <EssayCoachChat
            topic={topic}
            draft={draft}
            universityId={universityId}
            facultyId={facultyId}
            questionType={materialForCoach?.questionType}
            sourceText={materialForCoach?.sourceText}
            chartData={materialForCoach?.chartData}
            resetKey={`${universityId ?? ""}:${facultyId ?? ""}:${conversationKey ?? topic}`}
            onThreadChange={onThreadChange}
          />
        )}
        {active === "ap" && (
          <APReference universityId={universityId} facultyId={facultyId} />
        )}
        {active === "neta" && (
          <NetaReference universityId={universityId} facultyId={facultyId} />
        )}
        {active === "self" && <SelfAnalysisReference />}
      </div>
    </Card>
  );
}

function ReferenceReference({ material }: { material: ReferenceMaterial }) {
  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-4 text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-800">出題資料</span>
        {(material.questionType === "english-reading" ||
          material.questionType === "mixed") && (
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-xs text-emerald-700"
          >
            英文
          </Badge>
        )}
        {(material.questionType === "data-analysis" ||
          material.questionType === "mixed") && (
          <Badge
            variant="outline"
            className="border-purple-300 bg-purple-50 text-xs text-purple-700"
          >
            グラフ
          </Badge>
        )}
      </div>
      {material.sourceText && (
        <div className="rounded-lg border bg-gray-50 p-3">
          <p className="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
            {material.sourceText}
          </p>
        </div>
      )}
      {material.chartData && material.chartData.length > 0 && (
        <PastQuestionChart charts={material.chartData} />
      )}
    </div>
  );
}

/** 学部選択 UI のカテゴリ表示順 */
const FACULTY_CATEGORY_ORDER: FacultyCategory[] = [
  "humanities",
  "science",
  "medical",
  "other",
];

function NetaReference({
  universityId,
  facultyId,
}: {
  universityId?: string;
  facultyId?: string;
}) {
  const { data, isLoading } = useAuthSWR<University>(
    universityId ? `/api/universities/${universityId}` : null
  );

  // 志望校・学部から自動解決した topicFacultyId (取れない場合は undefined)
  const faculty = data?.faculties?.find((f) => f.id === facultyId);
  const academicField = faculty?.academicField;
  const autoResolvedFacultyId = academicField
    ? ACADEMIC_FIELD_TO_TOPIC_FACULTY[academicField]
    : undefined;

  // ユーザーが手動で選んだ学部 (セッション内のみ保持)
  const [manualFacultyId, setManualFacultyId] = useState<string | undefined>(
    undefined
  );
  const effectiveFacultyId = manualFacultyId ?? autoResolvedFacultyId;
  const topicData = effectiveFacultyId
    ? FACULTY_TOPIC_DATA[effectiveFacultyId]
    : undefined;

  // 利用可能な学部をカテゴリ別にグループ化
  const groupedFaculties = useMemo(() => {
    const groups: Record<FacultyCategory, FacultyEntry[]> = {
      humanities: [],
      science: [],
      medical: [],
      other: [],
    };
    for (const f of FACULTY_REGISTRY) {
      if (f.available) groups[f.category].push(f);
    }
    return groups;
  }, []);

  const showRevertLink =
    autoResolvedFacultyId &&
    manualFacultyId &&
    manualFacultyId !== autoResolvedFacultyId;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 学部セレクタ (常設) */}
      <div className="shrink-0 space-y-1.5 border-b p-2.5">
        <div className="text-muted-foreground text-[11px]">
          学部別ネタインプット
        </div>
        <Select
          value={effectiveFacultyId ?? ""}
          onValueChange={(v: string | null) =>
            setManualFacultyId(v ?? undefined)
          }
        >
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder="学部を選択..." />
          </SelectTrigger>
          <SelectContent>
            {FACULTY_CATEGORY_ORDER.map((cat) => (
              <SelectGroup key={cat}>
                <SelectLabel>{FACULTY_CATEGORY_LABELS[cat]}</SelectLabel>
                {groupedFaculties[cat].map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {showRevertLink && (
          <button
            type="button"
            onClick={() => setManualFacultyId(undefined)}
            className="text-primary cursor-pointer text-[11px] hover:underline"
          >
            志望学部に戻す
          </button>
        )}
      </div>

      {/* 本体 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && universityId && !effectiveFacultyId ? (
          <div className="text-muted-foreground p-4 text-sm">読み込み中...</div>
        ) : !topicData ? (
          <div className="text-muted-foreground p-4 text-sm">
            上のセレクタから学部を選ぶと、その学部のネタインプットが表示されます。
          </div>
        ) : (
          <div className="space-y-3 p-3">
            <div className="px-1">
              <div className="text-sm font-semibold">
                {topicData.facultyLabel}
              </div>
              <Link
                href={`/student/topic-input/${effectiveFacultyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary mt-1 inline-flex items-center gap-1 text-[11px] hover:underline"
              >
                全ネタを別ページで開く
                <ChevronRight className="size-3" />
              </Link>
            </div>
            {topicData.categories.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wide uppercase">
                  {cat.label}
                </div>
                <div className="space-y-1.5">
                  {cat.topics.map((topic) => (
                    <NetaTopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NetaTopicCard({ topic }: { topic: FacultyTopic }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full cursor-pointer p-2.5 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs leading-snug font-medium">
              <span className="text-muted-foreground mr-1">
                #{topic.number}
              </span>
              {topic.title}
            </div>
            {!open && (
              <div className="text-muted-foreground mt-1 line-clamp-2 text-[11px]">
                {topic.summary}
              </div>
            )}
          </div>
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t px-2.5 py-2 text-[11px]">
          <div className="text-foreground/85 leading-relaxed">
            {topic.summary}
          </div>
          {topic.sections.map((sec) => (
            <div key={sec.id} className="border-muted border-l-2 pl-2">
              <div className="mb-0.5 text-[11px] font-semibold">
                {sec.heading}
              </div>
              <p className="text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {stripHighlights(sec.body)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
