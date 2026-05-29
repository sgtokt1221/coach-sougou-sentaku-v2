"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpenText,
  FileText,
  Lightbulb,
  MessageSquareText,
  Mic,
  PenLine,
  Sparkles,
  Sprout,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type FruitId = "statement" | "pr" | "interview" | "essay";

interface StoryFruit {
  id: FruitId;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  color: string;
  ring: string;
  Icon: typeof FileText;
  apScore: number;
  status: "ready" | "needs-evidence" | "needs-ap";
  summary: string;
  evidence: string[];
  nextAction: string;
}

type CalloutTail = "left" | "right" | "bottom";

interface StoryCallout {
  id: string;
  label: string;
  title: string;
  body: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  color: string;
  markerId: string;
  tail: CalloutTail;
}

const fruits: StoryFruit[] = [
  {
    id: "pr",
    label: "自己PR",
    shortLabel: "自己PR",
    x: 212,
    y: 118,
    color: "#f59e0b",
    ring: "#fef3c7",
    Icon: BadgeCheck,
    apScore: 78,
    status: "needs-evidence",
    summary: "強みは見えているが、活動実績との接続をもう一段具体化したい状態。",
    evidence: ["文化祭の企画調整", "探究発表のリーダー経験", "周囲からの評価"],
    nextAction: "強みを発揮した場面を、行動・困難・結果の順で1つ追加する。",
  },
  {
    id: "statement",
    label: "志望理由",
    shortLabel: "志望理由",
    x: 524,
    y: 104,
    color: "#10b981",
    ring: "#d1fae5",
    Icon: FileText,
    apScore: 86,
    status: "ready",
    summary: "価値観、興味、将来像がAPとつながり、出願書類に転用しやすい。",
    evidence: ["地域課題への関心", "公共政策への探究テーマ", "将来ビジョン"],
    nextAction: "大学で学びたい授業・研究室を1つ紐づける。",
  },
  {
    id: "essay",
    label: "小論文の独自視点",
    shortLabel: "小論文",
    x: 188,
    y: 262,
    color: "#38bdf8",
    ring: "#e0f2fe",
    Icon: PenLine,
    apScore: 72,
    status: "needs-ap",
    summary: "自分らしい問題意識はあるが、志望学部の観点への翻訳が薄い。",
    evidence: [
      "教育格差への問題意識",
      "部活動での後輩支援",
      "探究で読んだ資料",
    ],
    nextAction: "APキーワード『多角的分析』に対応する観点を1つ加える。",
  },
  {
    id: "interview",
    label: "面接回答",
    shortLabel: "面接回答",
    x: 560,
    y: 262,
    color: "#f97316",
    ring: "#ffedd5",
    Icon: Mic,
    apScore: 82,
    status: "ready",
    summary: "原体験から将来像まで一貫しており、深掘り質問にも耐えやすい。",
    evidence: ["原体験", "失敗からの成長", "大学での学びの計画"],
    nextAction: "30秒版と90秒版の回答に分けて練習する。",
  },
];

const branchLabels = [
  { label: "強み", x: 214, y: 178, color: "#b45309" },
  { label: "弱みと成長", x: 266, y: 320, color: "#0369a1" },
  { label: "興味関心", x: 470, y: 326, color: "#047857" },
  { label: "将来ビジョン", x: 522, y: 176, color: "#c2410c" },
];

const rootLabels = [
  { label: "原体験", x: 265, y: 472 },
  { label: "価値観", x: 382, y: 492 },
  { label: "譲れないこと", x: 492, y: 472 },
];

const apKeywords = ["主体性", "協働", "探究心", "社会接続"];

const analysisSteps = [
  "価値観",
  "強み",
  "成長",
  "興味",
  "ビジョン",
  "大学接続",
  "統合",
];

const partLegend = [
  {
    label: "根",
    detail: "原体験・価値観",
    Icon: Sprout,
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200",
  },
  {
    label: "幹",
    detail: "自分軸",
    Icon: BookOpenText,
    className:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/25 dark:text-orange-200",
  },
  {
    label: "枝",
    detail: "分析テーマ",
    Icon: Lightbulb,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200",
  },
  {
    label: "実",
    detail: "出願素材",
    Icon: Sparkles,
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-200",
  },
];

function calloutTailPath(callout: StoryCallout) {
  if (callout.tail === "left") {
    return `M${callout.x} ${callout.fromY - 8} L${callout.x - 14} ${callout.fromY} L${callout.x} ${callout.fromY + 8} Z`;
  }

  if (callout.tail === "right") {
    return `M${callout.x + callout.width} ${callout.fromY - 8} L${callout.x + callout.width + 14} ${callout.fromY} L${callout.x + callout.width} ${callout.fromY + 8} Z`;
  }

  return `M${callout.fromX - 9} ${callout.y + callout.height} L${callout.fromX} ${callout.y + callout.height + 14} L${callout.fromX + 9} ${callout.y + callout.height} Z`;
}

function statusLabel(status: StoryFruit["status"]) {
  if (status === "ready") return "使える";
  if (status === "needs-evidence") return "根拠追加";
  return "AP接続";
}

function statusClass(status: StoryFruit["status"]) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (status === "needs-evidence") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  }
  return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300";
}

export function StoryTreePreview() {
  const [selectedId, setSelectedId] = useState<FruitId>("statement");

  const selected = useMemo(
    () => fruits.find((fruit) => fruit.id === selectedId) ?? fruits[0],
    [selectedId]
  );

  const selectedIndex = fruits.findIndex((fruit) => fruit.id === selected.id);
  const treeOffset = { x: 30, y: 6 };
  const treeX = (x: number) => x + treeOffset.x;
  const treeY = (y: number) => y + treeOffset.y;
  const selectedCallout =
    selected.x < 360
      ? {
          x: 36,
          y: selected.y < 180 ? 62 : 310,
          width: 166,
          height: 58,
          fromX: 202,
          fromY: selected.y < 180 ? 91 : 339,
          tail: "right" as const,
        }
      : selected.y < 180
        ? {
            x: 430,
            y: 30,
            width: 170,
            height: 58,
            fromX: 515,
            fromY: 88,
            tail: "bottom" as const,
          }
        : {
            x: 626,
            y: 306,
            width: 166,
            height: 58,
            fromX: 626,
            fromY: 335,
            tail: "left" as const,
          };
  const storyCallouts: StoryCallout[] = [
    {
      id: "branch",
      label: "枝",
      title: "分析テーマ",
      body: "強み・成長・興味へ分岐",
      x: 42,
      y: 220,
      width: 168,
      height: 58,
      fromX: 210,
      fromY: 249,
      targetX: treeX(262),
      targetY: treeY(282),
      color: "#059669",
      markerId: "story-arrow-emerald",
      tail: "right",
    },
    {
      id: "selected-fruit",
      label: "実",
      title: selected.shortLabel,
      body: `AP ${selected.apScore}% / ${statusLabel(selected.status)}`,
      x: selectedCallout.x,
      y: selectedCallout.y,
      width: selectedCallout.width,
      height: selectedCallout.height,
      fromX: selectedCallout.fromX,
      fromY: selectedCallout.fromY,
      targetX: treeX(selected.x),
      targetY: treeY(selected.y),
      color: selected.color,
      markerId: "story-arrow-selected",
      tail: selectedCallout.tail,
    },
    {
      id: "ap",
      label: "AP",
      title: "志望校照合",
      body: "大学の観点に接続",
      x: 628,
      y: 122,
      width: 146,
      height: 58,
      fromX: 628,
      fromY: 151,
      targetX: treeX(654),
      targetY: treeY(78),
      color: "#047857",
      markerId: "story-arrow-emerald",
      tail: "left",
    },
    {
      id: "trunk",
      label: "幹",
      title: "自分軸",
      body: "回答を束ねる判断基準",
      x: 508,
      y: 398,
      width: 176,
      height: 58,
      fromX: 508,
      fromY: 427,
      targetX: treeX(383),
      targetY: treeY(352),
      color: "#c2410c",
      markerId: "story-arrow-orange",
      tail: "left",
    },
    {
      id: "root",
      label: "根",
      title: "原体験・価値観",
      body: "事実と価値観の土台",
      x: 54,
      y: 434,
      width: 170,
      height: 58,
      fromX: 224,
      fromY: 463,
      targetX: treeX(310),
      targetY: treeY(468),
      color: "#d97706",
      markerId: "story-arrow-amber",
      tail: "right",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="bg-background text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm">
            <Sprout className="text-primary size-3.5" />
            Story Tree preview
          </div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            自己分析の木 2.0
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            根にある原体験から、自分軸、AP接続、出願で使える文章素材までを一枚で確認する試作画面です。
          </p>
        </div>
        <div className="bg-card grid grid-cols-3 gap-2 rounded-xl border p-2 text-center shadow-sm sm:min-w-[330px]">
          <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
            <p className="text-muted-foreground text-[11px]">AP一致</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              82%
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
            <p className="text-muted-foreground text-[11px]">素材化</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
              4件
            </p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-2 dark:bg-sky-950/30">
            <p className="text-muted-foreground text-[11px]">残タスク</p>
            <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
              2件
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="bg-card relative self-start overflow-hidden rounded-xl border shadow-sm">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(236,253,245,0.78),rgba(255,251,235,0.32)_58%,rgba(254,243,199,0.5))] dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.18),rgba(30,41,59,0.3)_58%,rgba(120,53,15,0.16))]" />
          <div className="relative flex min-h-[620px] flex-col">
            <div className="bg-background/70 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                  <Target className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">
                    立命館大学 政策科学部
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    AP: 主体性・協働・社会課題への探究
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {apKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="bg-background/80"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-background/65 hidden flex-wrap gap-2 border-b px-4 py-2 backdrop-blur md:flex lg:hidden">
              {partLegend.map(({ label, detail, Icon, className }) => (
                <div
                  key={label}
                  className={cn(
                    "flex min-w-[128px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                    className
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="font-bold">{label}</span>
                  <span className="truncate opacity-75">{detail}</span>
                </div>
              ))}
            </div>

            <div className="bg-background/70 hidden border-b px-4 py-3 backdrop-blur md:block xl:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {fruits.map((fruit) => {
                  const Icon = fruit.Icon;
                  const isSelected = fruit.id === selected.id;
                  return (
                    <button
                      key={fruit.id}
                      type="button"
                      onClick={() => setSelectedId(fruit.id)}
                      className={cn(
                        "flex min-h-14 min-w-[168px] flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs shadow-sm transition",
                        isSelected
                          ? "bg-white/95 ring-2 ring-emerald-100 dark:bg-slate-950/70 dark:ring-emerald-900/40"
                          : "border-border/70 bg-background/90 hover:bg-muted/60"
                      )}
                      style={{
                        borderColor: isSelected ? fruit.color : undefined,
                      }}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: fruit.color }}
                      >
                        <Icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {fruit.label}
                        </span>
                        <span className="text-muted-foreground block truncate">
                          AP {fruit.apScore}% / {statusLabel(fruit.status)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[168px_minmax(0,1fr)]">
              <nav className="bg-background/75 hidden rounded-lg border p-2 text-xs shadow-sm lg:block">
                <p className="text-muted-foreground px-2 pb-2 text-[11px] font-semibold">
                  木の見方
                </p>
                {partLegend.map(({ label, detail, Icon, className }) => (
                  <div
                    key={label}
                    className={cn(
                      "mb-2 rounded-lg border px-2.5 py-2",
                      className
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Icon className="size-3.5" />
                      {label}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-80">
                      {detail}
                    </p>
                  </div>
                ))}
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white/70 p-2 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
                  AP照合の線が、自己分析と志望校の接続を示します。
                </div>
              </nav>

              <div className="hidden md:block">
                <div className="relative min-h-[500px] overflow-hidden rounded-lg border bg-white/72 shadow-inner dark:bg-slate-950/30">
                  <div className="absolute inset-0 bg-[url('/images/self-analysis/story-tree-bg.png')] bg-cover bg-center opacity-28" />
                  <div className="absolute inset-0 bg-white/76 dark:bg-slate-950/60" />
                  <svg
                    viewBox="0 0 820 560"
                    role="img"
                    aria-label="自己分析の木 2.0 のプレビュー"
                    className="relative h-full min-h-[500px] w-full"
                  >
                    <defs>
                      <linearGradient
                        id="story-trunk"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#6b3d1c" />
                        <stop offset="52%" stopColor="#9a642d" />
                        <stop offset="100%" stopColor="#5f3517" />
                      </linearGradient>
                      <radialGradient id="story-leaf" cx="35%" cy="25%" r="70%">
                        <stop offset="0%" stopColor="#bbf7d0" />
                        <stop offset="62%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#15803d" />
                      </radialGradient>
                      <filter
                        id="story-soft-shadow"
                        x="-30%"
                        y="-30%"
                        width="160%"
                        height="160%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="6"
                          stdDeviation="6"
                          floodColor="#0f172a"
                          floodOpacity="0.14"
                        />
                      </filter>
                      <filter
                        id="story-glow"
                        x="-80%"
                        y="-80%"
                        width="260%"
                        height="260%"
                      >
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter
                        id="story-callout-shadow"
                        x="-20%"
                        y="-30%"
                        width="140%"
                        height="170%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="5"
                          stdDeviation="5"
                          floodColor="#0f172a"
                          floodOpacity="0.11"
                        />
                      </filter>
                      <marker
                        id="story-arrow-amber"
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0 0 L10 5 L0 10 Z" fill="#d97706" />
                      </marker>
                      <marker
                        id="story-arrow-emerald"
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0 0 L10 5 L0 10 Z" fill="#059669" />
                      </marker>
                      <marker
                        id="story-arrow-orange"
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0 0 L10 5 L0 10 Z" fill="#c2410c" />
                      </marker>
                      <marker
                        id="story-arrow-selected"
                        viewBox="0 0 10 10"
                        refX="8.5"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto"
                      >
                        <path d="M0 0 L10 5 L0 10 Z" fill={selected.color} />
                      </marker>
                    </defs>

                    <rect
                      x="0"
                      y="0"
                      width="820"
                      height="560"
                      fill="#f8fafc"
                      opacity="0.45"
                    />
                    <g transform={`translate(${treeOffset.x} ${treeOffset.y})`}>
                      <path
                        d="M86 488 C210 456 306 492 382 474 C486 448 576 474 684 444 L684 540 L86 540 Z"
                        fill="#fef3c7"
                        opacity="0.62"
                      />
                      <path
                        d="M382 456 C350 426 318 428 280 444 M382 458 C420 428 462 426 514 444 M375 476 C328 480 292 503 240 520 M391 476 C438 486 474 508 534 520"
                        stroke="#8a5a22"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.6"
                      />

                      <g opacity="0.82">
                        {rootLabels.map((root) => (
                          <g key={root.label}>
                            <circle
                              cx={root.x}
                              cy={root.y - 4}
                              r="8"
                              fill="#f59e0b"
                              opacity="0.2"
                            />
                            <circle
                              cx={root.x}
                              cy={root.y - 4}
                              r="4"
                              fill="#f59e0b"
                              opacity="0.72"
                            />
                          </g>
                        ))}
                      </g>

                      <g filter="url(#story-soft-shadow)">
                        <path
                          d="M372 464 C370 402 364 352 377 292 C386 248 377 214 391 174 C402 142 392 111 405 82"
                          stroke="url(#story-trunk)"
                          strokeWidth="34"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d="M386 445 C384 382 383 331 392 280 C399 237 395 198 404 154"
                          stroke="#4a2810"
                          strokeWidth="3"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.34"
                        />
                      </g>

                      <g
                        stroke="#744617"
                        strokeWidth="13"
                        strokeLinecap="round"
                        fill="none"
                        filter="url(#story-soft-shadow)"
                      >
                        <path d="M390 230 C326 205 282 164 222 124" />
                        <path d="M398 232 C474 199 511 150 560 108" />
                        <path d="M382 318 C315 314 255 290 190 262" />
                        <path d="M397 318 C478 314 520 288 560 262" />
                      </g>

                      <g opacity="0.96">
                        {[
                          [390, 126, 106],
                          [286, 160, 82],
                          [500, 166, 86],
                          [250, 286, 74],
                          [512, 286, 76],
                          [380, 246, 100],
                          [322, 242, 74],
                          [442, 242, 76],
                        ].map(([cx, cy, r], index) => (
                          <circle
                            key={index}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="url(#story-leaf)"
                            opacity={index === 5 ? 0.82 : 0.74}
                          />
                        ))}
                      </g>

                      <g>
                        <circle
                          cx="383"
                          cy="352"
                          r="10"
                          fill="#ffedd5"
                          stroke="#c2410c"
                          strokeOpacity="0.28"
                        />
                        <circle
                          cx="383"
                          cy="352"
                          r="4"
                          fill="#c2410c"
                          opacity="0.82"
                        />
                      </g>

                      <path
                        d={`M654 78 C${selected.x + 70} ${selected.y - 58}, ${selected.x + 34} ${selected.y - 20}, ${selected.x} ${selected.y}`}
                        stroke="#10b981"
                        strokeWidth="2.25"
                        fill="none"
                        opacity="0.62"
                        strokeDasharray="8 7"
                      />

                      <g>
                        <circle
                          cx="654"
                          cy="78"
                          r="26"
                          fill="#ecfdf5"
                          stroke="#10b981"
                          strokeWidth="1.8"
                          filter="url(#story-glow)"
                        />
                        <circle
                          cx="654"
                          cy="78"
                          r="9"
                          fill="#10b981"
                          opacity="0.16"
                        />
                        <circle
                          cx="654"
                          cy="78"
                          r="4"
                          fill="#047857"
                          opacity="0.88"
                        />
                      </g>

                      {fruits.map((fruit) => {
                        const isSelected = fruit.id === selected.id;
                        const Icon = fruit.Icon;
                        return (
                          <g
                            key={fruit.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${fruit.label}を選択`}
                            onClick={() => setSelectedId(fruit.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedId(fruit.id);
                              }
                            }}
                            className="cursor-pointer outline-none"
                          >
                            <circle
                              cx={fruit.x}
                              cy={fruit.y}
                              r={isSelected ? 38 : 30}
                              fill={fruit.ring}
                              opacity={isSelected ? 0.9 : 0.48}
                              filter={
                                isSelected ? "url(#story-glow)" : undefined
                              }
                            />
                            <circle
                              cx={fruit.x}
                              cy={fruit.y}
                              r="24"
                              fill={fruit.color}
                              filter="url(#story-soft-shadow)"
                            />
                            <foreignObject
                              x={fruit.x - 11}
                              y={fruit.y - 12}
                              width="22"
                              height="22"
                            >
                              <Icon className="h-[22px] w-[22px] text-white" />
                            </foreignObject>
                          </g>
                        );
                      })}
                    </g>

                    {storyCallouts.map((callout) => {
                      const controlX = (callout.fromX + callout.targetX) / 2;
                      return (
                        <path
                          key={`${callout.id}-arrow`}
                          d={`M${callout.fromX} ${callout.fromY} C${controlX} ${callout.fromY}, ${controlX} ${callout.targetY}, ${callout.targetX} ${callout.targetY}`}
                          stroke={callout.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity="0.72"
                          markerEnd={`url(#${callout.markerId})`}
                        />
                      );
                    })}

                    {storyCallouts.map((callout) => (
                      <g
                        key={`${callout.id}-bubble`}
                        filter="url(#story-callout-shadow)"
                      >
                        <path
                          d={calloutTailPath(callout)}
                          fill="#ffffff"
                          stroke={callout.color}
                          strokeOpacity="0.32"
                        />
                        <rect
                          x={callout.x}
                          y={callout.y}
                          width={callout.width}
                          height={callout.height}
                          rx="16"
                          fill="#ffffff"
                          stroke={callout.color}
                          strokeOpacity="0.32"
                        />
                        <text
                          x={callout.x + 16}
                          y={callout.y + 22}
                          fontSize="12"
                          fill="#0f172a"
                        >
                          <tspan fontWeight="900" fill={callout.color}>
                            {callout.label}
                          </tspan>
                          <tspan dx="8" fontWeight="800">
                            {callout.title}
                          </tspan>
                          <tspan
                            x={callout.x + 16}
                            dy="18"
                            fontSize="11"
                            fontWeight="600"
                            fill="#64748b"
                          >
                            {callout.body}
                          </tspan>
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-7">
                  {analysisSteps.map((step, index) => (
                    <div
                      key={step}
                      className={cn(
                        "bg-background/86 h-9 rounded-md border px-2 py-1 text-center text-[11px] font-medium shadow-sm",
                        index < 5
                          ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <span className="block text-[10px] tabular-nums">
                        Step {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-white/76 p-3 shadow-inner md:hidden dark:bg-slate-950/30">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {partLegend.map(({ label, detail, Icon, className }) => (
                    <div
                      key={label}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-semibold",
                        className
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        {label}
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-80">{detail}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {rootLabels.map((root) => (
                    <div
                      key={root.label}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200"
                    >
                      {root.label}
                    </div>
                  ))}
                </div>

                <div className="relative mx-auto my-3 h-10 w-1 rounded-full bg-gradient-to-b from-amber-500 to-emerald-600" />

                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-center dark:border-orange-900 dark:bg-orange-950/25">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                    幹
                  </p>
                  <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    自分軸
                  </p>
                </div>

                <div className="my-3 grid grid-cols-2 gap-2">
                  {branchLabels.map((branch) => (
                    <div
                      key={branch.label}
                      className="bg-background rounded-lg border px-3 py-2 text-center text-xs font-semibold"
                      style={{ color: branch.color }}
                    >
                      {branch.label}
                    </div>
                  ))}
                </div>

                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/25">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      <Target className="size-4" />
                      AP照合
                    </div>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums dark:text-emerald-300">
                      82%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {apKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="bg-background"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {fruits.map((fruit) => {
                    const Icon = fruit.Icon;
                    const isSelected = fruit.id === selected.id;
                    return (
                      <button
                        key={fruit.id}
                        type="button"
                        onClick={() => setSelectedId(fruit.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left shadow-sm",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background"
                        )}
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: fruit.color }}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            {fruit.label}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            AP {fruit.apScore}% / {statusLabel(fruit.status)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {analysisSteps.map((step, index) => (
                    <div
                      key={step}
                      className={cn(
                        "bg-background/86 min-w-24 rounded-md border px-2 py-1 text-center text-[11px] font-medium shadow-sm",
                        index < 5
                          ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      <span className="block text-[10px] tabular-nums">
                        Step {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-card rounded-xl border p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  選択中の実
                </p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-bold">
                  <selected.Icon
                    className="size-5"
                    style={{ color: selected.color }}
                  />
                  {selected.label}
                </h2>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                  statusClass(selected.status)
                )}
              >
                {statusLabel(selected.status)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    AP一致度
                  </span>
                  <span className="font-bold tabular-nums">
                    {selected.apScore}%
                  </span>
                </div>
                <Progress value={selected.apScore} className="h-2" />
              </div>

              <p className="bg-muted/55 rounded-lg p-3 text-sm leading-relaxed">
                {selected.summary}
              </p>

              <div>
                <p className="text-muted-foreground mb-2 text-xs font-semibold">
                  根拠素材
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.evidence.map((item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className="bg-background"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <Lightbulb className="size-4" />
                  次に深めること
                </div>
                <p className="leading-relaxed">{selected.nextAction}</p>
              </div>
            </div>
          </section>

          <section className="bg-card rounded-xl border p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">出願素材への変換</h2>
            <div className="space-y-2">
              {fruits.map((fruit, index) => {
                const Icon = fruit.Icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={fruit.id}
                    type="button"
                    onClick={() => setSelectedId(fruit.id)}
                    className={cn(
                      "hover:bg-muted flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: fruit.color }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{fruit.label}</span>
                      <span className="text-muted-foreground block text-xs">
                        AP {fruit.apScore}% / {statusLabel(fruit.status)}
                      </span>
                    </span>
                    <MessageSquareText className="text-muted-foreground size-4" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-card rounded-xl border p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">この案で実装する技術</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {["React state", "SVG paths", "Tailwind", "既存UI部品"].map(
                (item) => (
                  <div
                    key={item}
                    className="bg-background rounded-lg border px-3 py-2 font-medium"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
            <Button className="mt-4 w-full gap-2" type="button">
              <Sparkles className="size-4" />
              この方向で本実装へ
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
