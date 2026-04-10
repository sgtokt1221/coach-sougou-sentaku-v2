"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lawTopics } from "@/data/faculty-topics/law";
import { TopicCard } from "@/components/topic-input/TopicCard";
import { HighlightLegend } from "@/components/topic-input/HighlightLegend";
import { getFacultyById } from "@/data/faculty-topics/registry";
import type { FacultyTopicData } from "@/data/faculty-topics/types";

const FACULTY_DATA: Record<string, FacultyTopicData> = {
  law: lawTopics,
};

export default function FacultyTopicPage() {
  const params = useParams();
  const facultyId = params.facultyId as string;

  const faculty = getFacultyById(facultyId);
  const data = FACULTY_DATA[facultyId];

  if (!faculty || !data) {
    notFound();
  }

  const totalTopics = data.categories.reduce(
    (acc, c) => acc + c.topics.length,
    0,
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
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
          全 <span className="font-semibold text-foreground">{totalTopics}本</span> ／
          {data.categories.length}カテゴリ
        </p>
      </div>

      <HighlightLegend />

      <Tabs defaultValue={data.categories[0].id} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="flex flex-nowrap h-auto gap-1 w-max">
            {data.categories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="text-xs whitespace-nowrap"
              >
                {cat.label} ({cat.topics.length})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {data.categories.map((cat) => (
          <TabsContent
            key={cat.id}
            value={cat.id}
            className="w-full space-y-3 mt-4"
          >
            <p className="text-xs text-muted-foreground px-1">
              {cat.description}
            </p>
            <div className="w-full space-y-3">
              {cat.topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
