"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { lawTopics } from "@/data/faculty-topics/law";
import { TopicCard } from "@/components/topic-input/TopicCard";
import { HighlightLegend } from "@/components/topic-input/HighlightLegend";
import {
  SegmentControl,
  type SegmentAccent,
} from "@/components/shared/SegmentControl";
import { getFacultyById } from "@/data/faculty-topics/registry";
import type {
  FacultyTopicCategory,
  FacultyTopicData,
} from "@/data/faculty-topics/types";

const FACULTY_DATA: Record<string, FacultyTopicData> = {
  law: lawTopics,
};

const ACCENT_BY_CATEGORY: Record<FacultyTopicCategory, SegmentAccent> = {
  jinken: "blue",
  "iken-hanketsu": "amber",
  "ai-ho": "violet",
};

export default function FacultyTopicPage() {
  const params = useParams();
  const facultyId = params.facultyId as string;

  const faculty = getFacultyById(facultyId);
  const data = FACULTY_DATA[facultyId];

  const [activeId, setActiveId] = useState<FacultyTopicCategory>(
    data?.categories[0]?.id ?? ("jinken" as FacultyTopicCategory),
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

  const segmentOptions = data.categories.map((c) => ({
    id: c.id,
    label: c.label,
    count: c.topics.length,
    accent: ACCENT_BY_CATEGORY[c.id],
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
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  );
}
