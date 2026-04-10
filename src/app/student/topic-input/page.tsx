"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FACULTY_REGISTRY,
  FACULTY_CATEGORY_LABELS,
  type FacultyCategory,
  type FacultyEntry,
} from "@/data/faculty-topics/registry";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: FacultyCategory[] = [
  "humanities",
  "science",
  "medical",
  "other",
];

function FacultyCard({ faculty }: { faculty: FacultyEntry }) {
  const inner = (
    <Card
      className={cn(
        "h-full transition-all bg-gradient-to-br",
        faculty.accent,
        faculty.available
          ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          : "opacity-60",
      )}
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold">{faculty.label}</h3>
          {faculty.available ? (
            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <Lock className="size-4 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {faculty.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {faculty.available ? (
            <Badge variant="default" className="text-[10px]">
              全{faculty.topicCount}本
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              準備中（予定 {faculty.plannedCount}本）
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (faculty.available) {
    return (
      <Link href={`/student/topic-input/${faculty.id}`} className="block h-full">
        {inner}
      </Link>
    );
  }
  return <div className="h-full">{inner}</div>;
}

export default function TopicInputIndexPage() {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: FACULTY_CATEGORY_LABELS[category],
    items: FACULTY_REGISTRY.filter((f) => f.category === category),
  }));

  const availableCount = FACULTY_REGISTRY.filter((f) => f.available).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-5 lg:py-8 space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">ネタインプット</h1>
        <p className="text-sm text-muted-foreground mt-1">
          学部系統別に必須の背景知識を学べます。志望する学部のカードを選んでください。
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          現在 <span className="font-semibold">{availableCount}学部</span> が利用可能。他の学部は順次追加予定。
        </p>
      </div>

      {grouped.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((faculty) => (
              <FacultyCard key={faculty.id} faculty={faculty} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
