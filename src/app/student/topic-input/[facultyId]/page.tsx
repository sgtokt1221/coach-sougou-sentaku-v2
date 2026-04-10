"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
import { TopicCard } from "@/components/topic-input/TopicCard";
import { HighlightLegend } from "@/components/topic-input/HighlightLegend";
import {
  SegmentControl,
  type SegmentAccent,
} from "@/components/shared/SegmentControl";
import { getFacultyById } from "@/data/faculty-topics/registry";
import type {
  FacultyTopic,
  FacultyTopicCategory,
  FacultyTopicData,
} from "@/data/faculty-topics/types";

const FACULTY_DATA: Record<string, FacultyTopicData> = {
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

/**
 * 学部 × カテゴリID のアクセント色マッピング。
 * 新しい学部を追加するときはここに 3-5 色を定義する。
 * カテゴリIDが定義されていない場合は undefined が返り、SegmentControl の defaultAccent が使われる。
 */
const ACCENT_BY_FACULTY: Record<string, Record<string, SegmentAccent>> = {
  law: {
    jinken: "blue",
    "iken-hanketsu": "amber",
    "ai-ho": "violet",
  },
  economics: {
    basics: "emerald",
    history: "amber",
    trends: "violet",
  },
  medicine: {
    basics: "blue",
    ethics: "rose",
    trends: "violet",
  },
  nursing: {
    basics: "blue",
    practice: "emerald",
    trends: "violet",
  },
  informatics: {
    basics: "blue",
    society: "amber",
    trends: "violet",
  },
  engineering: {
    basics: "slate",
    history: "amber",
    trends: "violet",
  },
  education: {
    theory: "blue",
    system: "amber",
    trends: "violet",
  },
  psychology: {
    basics: "blue",
    applied: "emerald",
    trends: "violet",
  },
  international: {
    basics: "blue",
    issues: "amber",
    trends: "violet",
  },
  sociology: {
    theory: "blue",
    modern: "amber",
    trends: "violet",
  },
  business: {
    basics: "emerald",
    history: "amber",
    trends: "violet",
  },
  humanities: {
    literature: "rose",
    philosophy: "blue",
    history: "amber",
  },
  science: {
    basics: "blue",
    history: "amber",
    trends: "violet",
  },
  agriculture: {
    basics: "emerald",
    environment: "amber",
    trends: "violet",
  },
  pharmacy: {
    basics: "blue",
    practice: "emerald",
    trends: "violet",
  },
  "art-sports": {
    arts: "rose",
    sports: "amber",
    trends: "violet",
  },
};

export default function FacultyTopicPage() {
  const params = useParams();
  const facultyId = params.facultyId as string;

  const faculty = getFacultyById(facultyId);
  const data = FACULTY_DATA[facultyId];

  const [activeId, setActiveId] = useState<FacultyTopicCategory>(
    data?.categories[0]?.id ?? "",
  );
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  // ID → DOM ref のマップ（スクロール用）
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ID → topic, ID → categoryId, ID → title の検索用マップ
  const indices = useMemo(() => {
    const topicById: Record<string, FacultyTopic> = {};
    const categoryByTopicId: Record<string, string> = {};
    const titleById: Record<string, string> = {};
    if (data) {
      for (const cat of data.categories) {
        for (const t of cat.topics) {
          topicById[t.id] = t;
          categoryByTopicId[t.id] = cat.id;
          titleById[t.id] = `#${t.number} ${t.title}`;
        }
      }
    }
    return { topicById, categoryByTopicId, titleById };
  }, [data]);

  const handleNavigateToTopic = useCallback(
    (topicId: string) => {
      const targetCategory = indices.categoryByTopicId[topicId];
      if (!targetCategory) return;

      // カテゴリが違えば切替
      if (targetCategory !== activeId) {
        setActiveId(targetCategory);
      }
      // 開く
      setOpenTopicId(topicId);

      // スクロール（DOM更新を待つため少し遅延）
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = cardRefs.current[topicId];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      });
    },
    [activeId, indices.categoryByTopicId],
  );

  if (!faculty || !data) {
    notFound();
  }

  const totalTopics = data.categories.reduce(
    (acc, c) => acc + c.topics.length,
    0,
  );
  const activeCategory =
    data.categories.find((c) => c.id === activeId) ?? data.categories[0];

  const accentMap = ACCENT_BY_FACULTY[facultyId] ?? {};
  const segmentOptions = data.categories.map((c) => ({
    id: c.id,
    label: c.label,
    count: c.topics.length,
    accent: accentMap[c.id] as SegmentAccent | undefined,
  }));

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-5 lg:space-y-6">
      <Link
        href="/student/topic-input"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        学部一覧へ戻る
      </Link>

      <div>
        <h1 className="text-xl lg:text-2xl font-bold">{data.facultyLabel}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {faculty.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          全{" "}
          <span className="font-semibold text-foreground">{totalTopics}本</span>{" "}
          ／ {data.categories.length}カテゴリ
        </p>
      </div>

      <HighlightLegend />

      <SegmentControl
        value={activeId}
        onChange={(next) => setActiveId(next as FacultyTopicCategory)}
        options={segmentOptions}
      />

      <div className="w-full space-y-3">
        <p className="text-xs text-muted-foreground px-1">
          {activeCategory.description}
        </p>
        {activeCategory.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            ref={(el) => {
              cardRefs.current[topic.id] = el;
            }}
            isOpen={openTopicId === topic.id}
            onToggle={() =>
              setOpenTopicId((prev) => (prev === topic.id ? null : topic.id))
            }
            onRelatedClick={handleNavigateToTopic}
            topicTitleMap={indices.titleById}
          />
        ))}
      </div>
    </div>
  );
}
