"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  MessageSquare,
  Target,
  BookOpen,
  ChevronRight,
  Sprout,
  FileText,
  BarChart3,
  Search,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { EssayCoachChat } from "./EssayCoachChat";
import { SelfAnalysisReference } from "./SelfAnalysisReference";
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

type TabId = "reference" | "coach" | "ap" | "neta" | "self" | "search";

// PastQuestionChart の chart data type (既存モデルに合わせる、詳細は chart コンポーネントに委ねる)
type PastQuestionChartData = Parameters<typeof PastQuestionChart>[0]["charts"];

export interface ReferenceMaterial {
  sourceText?: string;
  chartData?: PastQuestionChartData;
  questionType?: string;
}

interface EssayCoachPanelProps {
  topic: string;
  draft: string;
  universityId?: string;
  facultyId?: string;
  /** 過去問の参考資料 (あれば 資料 タブが先頭に追加される) */
  referenceMaterial?: ReferenceMaterial;
}

function resolveReferenceLabel(material: ReferenceMaterial | undefined): {
  label: string;
  Icon: typeof MessageSquare;
} {
  const qt = material?.questionType;
  const hasText = Boolean(material?.sourceText);
  const hasChart = Boolean(material?.chartData && material.chartData.length > 0);
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
): TabDef[] {
  // 主要タブ (大きく表示): 資料 vs AIコーチ の選択
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
  { id: "search", label: "検索", Icon: Search },
];

export function EssayCoachPanel(props: EssayCoachPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* デスクトップ: 左列として常設 (2 カラムレイアウトの左) */}
      <div className="hidden lg:flex lg:flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <PanelBody {...props} />
      </div>

      {/* モバイル: FAB + Sheet (lg 未満) */}
      <Button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-40 h-14 rounded-full shadow-lg cursor-pointer px-5 gap-2"
        aria-label="執筆サポートを開く"
      >
        <MessageSquare className="size-5" />
        <span className="hidden sm:inline text-sm">サポート</span>
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="lg:hidden w-full p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b">
            <SheetTitle>執筆サポート</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col">
            <PanelBody {...props} />
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
  referenceMaterial,
}: EssayCoachPanelProps) {
  const hasReference = Boolean(
    referenceMaterial?.sourceText ||
      (referenceMaterial?.chartData && referenceMaterial.chartData.length > 0),
  );
  const primaryTabs = buildPrimaryTabs(hasReference, referenceMaterial);
  const [active, setActive] = useState<TabId>(hasReference ? "reference" : "coach");

  return (
    <Card className="flex flex-col h-full min-h-0 overflow-hidden rounded-xl">
      {/* 主要タブ (大きく表示) 資料 ↔ AIコーチ */}
      <div className="flex items-center gap-1 border-b bg-muted/30 p-1.5">
        {primaryTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
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
            className={`flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
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

      <div className="flex-1 min-h-0 overflow-hidden">
        {active === "reference" && hasReference && (
          <ReferenceReference material={referenceMaterial!} />
        )}
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
        {active === "neta" && (
          <NetaReference universityId={universityId} facultyId={facultyId} />
        )}
        {active === "self" && <SelfAnalysisReference />}
        {active === "search" && <GoogleSearchPanel />}
      </div>
    </Card>
  );
}

/**
 * Google Programmable Search Engine (PSE) 埋め込み検索パネル。
 *
 * - 環境変数 NEXT_PUBLIC_GOOGLE_PSE_CX に PSE の Search Engine ID を設定すると
 *   パネル内に検索ボックス + 結果一覧を直接描画する (= サイト内ブラウジング体験)
 * - 未設定時は fallback として新規タブ起動方式の入力フォームを表示
 * - 個別リンク先サイトは各社の X-Frame-Options により iframe 化不可なので、
 *   結果リンクは別タブで開かれる仕様 (= PSE デフォルト挙動)
 */
function GoogleSearchPanel() {
  const cx = process.env.NEXT_PUBLIC_GOOGLE_PSE_CX;
  if (!cx) return <GoogleSearchFallback />;
  return <GoogleSearchEmbedded cx={cx} />;
}

interface ReaderArticle {
  title: string;
  content: string;
  author: string | null;
  source: string;
  url: string;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** 抽出した本文を、スタイル隔離した sandbox iframe 用の HTML 文書に整形 */
function buildReaderDoc(a: ReaderArticle): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeAttr(a.url)}" target="_blank">
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:16px 18px 40px; font-family: system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif; line-height:1.85; color:#1f2937; background:#fff; -webkit-text-size-adjust:100%; word-break:break-word; }
  .r-article { max-width:720px; margin:0 auto; font-size:15px; }
  .r-article img,.r-article figure img,.r-article video { max-width:100%; height:auto; border-radius:8px; }
  .r-article h1,.r-article h2,.r-article h3 { line-height:1.45; margin:1.4em 0 .5em; }
  .r-article p { margin:0 0 1em; }
  .r-article a { color:#0d9488; }
  .r-article code { background:#f3f4f6; border-radius:6px; padding:.1em .3em; }
  .r-article pre { background:#f3f4f6; border-radius:6px; padding:12px; overflow:auto; }
  .r-article blockquote { margin:1em 0; padding:.2em 1em; border-left:3px solid #14b8a6; color:#4b5563; }
  .r-article figure { margin:1em 0; }
  .r-article table { border-collapse:collapse; display:block; max-width:100%; overflow:auto; }
  .r-article td,.r-article th { border:1px solid #e5e7eb; padding:6px 8px; }
  @media (prefers-color-scheme: dark){ body{background:#0b0f17;color:#e5e7eb;} .r-article a{color:#2dd4bf;} .r-article code,.r-article pre{background:#1f2937;} .r-article blockquote{color:#9ca3af;} }
</style></head>
<body><div class="r-article">${a.content}</div></body></html>`;
}

function GoogleSearchEmbedded({ cx }: { cx: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reader, setReader] = useState<{ url: string } | null>(null);
  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PSE の初期化（タブ切替後の再描画を促す）
  useEffect(() => {
    const w = window as unknown as {
      google?: { search?: { cse?: { element?: { go?: () => void } } } };
    };
    w.google?.search?.cse?.element?.go?.();
  }, []);

  const loadReader = useCallback(async (url: string) => {
    setReader({ url });
    setArticle(null);
    setError(null);
    setLoading(true);
    try {
      const res = await authFetch(`/api/reader?url=${encodeURIComponent(url)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.content) {
        setError(data?.error || "このページはパネル内で表示できませんでした。");
      } else {
        setArticle(data as ReaderArticle);
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  // 検索結果リンクのクリックを横取りし、別タブ/オーバーレイの代わりにパネル内リーダーで開く。
  // document の capture phase で受けることで PSE 自身のハンドラより先に処理する。
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !container.contains(a)) return;
      const href = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) return;
      let host = "";
      try {
        host = new URL(href).hostname;
      } catch {
        return;
      }
      // PSE 自身の UI リンク（google 系）は通常どおり動作させる
      if (
        /(^|\.)google\.com$/i.test(host) ||
        host.includes("cse.google") ||
        host.includes("googleusercontent")
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      loadReader(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [loadReader]);

  return (
    <div className="relative h-full">
      {/* 検索ビュー（常時マウント。リーダー表示中は非表示にして状態を保持） */}
      <div className={reader ? "hidden" : "h-full overflow-y-auto p-3 space-y-2"}>
        <div className="flex items-center gap-2">
          <Search className="size-4 text-teal-600" />
          <span className="text-sm font-semibold">Google検索</span>
        </div>
        <Script
          src={`https://cse.google.com/cse.js?cx=${encodeURIComponent(cx)}`}
          strategy="afterInteractive"
        />
        <div ref={containerRef} className="gcse-search" />
      </div>

      {/* リーダービュー */}
      {reader && (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                setReader(null);
                setArticle(null);
                setError(null);
              }}
            >
              <ArrowLeft className="size-4" />
              検索に戻る
            </Button>
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {article?.title || reader.url}
            </span>
            <a
              href={reader.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-teal-700 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              元ページ
            </a>
          </div>

          <div className="min-h-0 flex-1">
            {loading && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                読み込み中…
              </div>
            )}
            {!loading && error && (
              <div className="space-y-3 p-4 text-sm">
                <p className="text-muted-foreground">{error}</p>
                <a
                  href={reader.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  元のページを新しいタブで開く
                </a>
              </div>
            )}
            {!loading && !error && article && (
              <iframe
                title={article.title || "リーダー"}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                srcDoc={buildReaderDoc(article)}
                className="h-full w-full border-0"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleSearchFallback() {
  const [query, setQuery] = useState("");
  const open = (q: string, target: "google" | "scholar") => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const url =
      target === "scholar"
        ? `https://scholar.google.com/scholar?q=${encodeURIComponent(trimmed)}`
        : `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="size-4 text-teal-600" />
        <span className="text-sm font-semibold">Google検索</span>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed">
        パネル内ブラウジングを有効にするには Google Programmable Search Engine
        (PSE) の Search Engine ID を環境変数{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_PSE_CX</code>{" "}
        に設定してください。 設定までは別タブ起動方式で動作します。
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          open(query, "google");
        }}
        className="flex items-center gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="キーワードを入力"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <Button type="submit" size="sm" className="gap-1">
          <Search className="size-4" />
          検索
        </Button>
      </form>
      {query.trim() && (
        <button
          type="button"
          onClick={() => open(query, "scholar")}
          className="text-xs text-teal-700 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="size-3" />
          Google Scholarで論文検索
        </button>
      )}
    </div>
  );
}

function ReferenceReference({ material }: { material: ReferenceMaterial }) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <FileText className="size-4 text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-800">出題資料</span>
        {(material.questionType === "english-reading" ||
          material.questionType === "mixed") && (
          <Badge
            variant="outline"
            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300"
          >
            英文
          </Badge>
        )}
        {(material.questionType === "data-analysis" ||
          material.questionType === "mixed") && (
          <Badge
            variant="outline"
            className="text-xs bg-purple-50 text-purple-700 border-purple-300"
          >
            グラフ
          </Badge>
        )}
      </div>
      {material.sourceText && (
        <div className="rounded-lg bg-gray-50 border p-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono break-words">
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
    universityId ? `/api/universities/${universityId}` : null,
  );

  // 志望校・学部から自動解決した topicFacultyId (取れない場合は undefined)
  const faculty = data?.faculties?.find((f) => f.id === facultyId);
  const academicField = faculty?.academicField;
  const autoResolvedFacultyId = academicField
    ? ACADEMIC_FIELD_TO_TOPIC_FACULTY[academicField]
    : undefined;

  // ユーザーが手動で選んだ学部 (セッション内のみ保持)
  const [manualFacultyId, setManualFacultyId] = useState<string | undefined>(undefined);
  const effectiveFacultyId = manualFacultyId ?? autoResolvedFacultyId;
  const topicData = effectiveFacultyId ? FACULTY_TOPIC_DATA[effectiveFacultyId] : undefined;

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
    <div className="h-full flex flex-col min-h-0">
      {/* 学部セレクタ (常設) */}
      <div className="border-b p-2.5 space-y-1.5 shrink-0">
        <div className="text-[11px] text-muted-foreground">学部別ネタインプット</div>
        <Select
          value={effectiveFacultyId ?? ""}
          onValueChange={(v: string | null) =>
            setManualFacultyId(v ?? undefined)
          }
        >
          <SelectTrigger className="w-full h-9 text-sm">
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
            className="text-[11px] text-primary hover:underline cursor-pointer"
          >
            志望学部に戻す
          </button>
        )}
      </div>

      {/* 本体 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && universityId && !effectiveFacultyId ? (
          <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>
        ) : !topicData ? (
          <div className="p-4 text-sm text-muted-foreground">
            上のセレクタから学部を選ぶと、その学部のネタインプットが表示されます。
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="px-1">
              <div className="text-sm font-semibold">{topicData.facultyLabel}</div>
              <Link
                href={`/student/topic-input/${effectiveFacultyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary hover:underline"
              >
                全ネタを別ページで開く
                <ChevronRight className="size-3" />
              </Link>
            </div>
            {topicData.categories.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
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
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-2.5 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium leading-snug">
              <span className="text-muted-foreground mr-1">#{topic.number}</span>
              {topic.title}
            </div>
            {!open && (
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                {topic.summary}
              </div>
            )}
          </div>
        </div>
      </button>
      {open && (
        <div className="border-t px-2.5 py-2 text-[11px] space-y-2">
          <div className="text-foreground/85 leading-relaxed">{topic.summary}</div>
          {topic.sections.map((sec) => (
            <div key={sec.id} className="border-l-2 border-muted pl-2">
              <div className="text-[11px] font-semibold mb-0.5">{sec.heading}</div>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/85">
                {stripHighlights(sec.body)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
