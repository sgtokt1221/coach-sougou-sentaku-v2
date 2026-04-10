"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { lawTopics } from "@/data/faculty-topics/law";
import { TopicCard } from "@/components/topic-input/TopicCard";
import { HighlightLegend } from "@/components/topic-input/HighlightLegend";

export default function TopicInputPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">ネタインプット</h1>
        <p className="text-sm text-muted-foreground mt-1">
          学部系統別に必須の背景知識を学べます。まずは
          <span className="font-semibold text-foreground">{lawTopics.facultyLabel}</span>
          から（全{lawTopics.categories.reduce((acc, c) => acc + c.topics.length, 0)}本）。
        </p>
      </div>

      <HighlightLegend />

      <Tabs defaultValue={lawTopics.categories[0].id}>
        <div className="overflow-x-auto">
          <TabsList className="flex flex-nowrap h-auto gap-1 w-max">
            {lawTopics.categories.map((cat) => (
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

        {lawTopics.categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground px-1">{cat.description}</p>
            {cat.topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
