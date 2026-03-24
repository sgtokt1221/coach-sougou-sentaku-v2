"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import type { University, Faculty, SelectionMethod } from "@/lib/types/university";

function calcDaysLeft(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function daysLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}日前に終了`;
  if (days === 0) return "今日";
  return `あと${days}日`;
}

function daysLeftColor(days: number): string {
  if (days < 0) return "text-muted-foreground";
  if (days <= 7) return "text-rose-600 dark:text-rose-400 font-bold";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function selectionTypeLabel(type: SelectionMethod["type"]): string {
  const map: Record<SelectionMethod["type"], string> = {
    documents: "書類選考",
    essay: "小論文",
    interview: "面接",
    presentation: "プレゼン",
    test: "筆記試験",
    other: "その他",
  };
  return map[type];
}

function selectionTypeVariant(
  type: SelectionMethod["type"]
): "default" | "secondary" | "outline" {
  if (type === "essay" || type === "test") return "default";
  if (type === "interview" || type === "presentation") return "secondary";
  return "outline";
}

interface ScheduleRow {
  label: string;
  date: string;
}

function ScheduleCard({ schedule }: { schedule: Faculty["schedule"] }) {
  const rows: ScheduleRow[] = [
    { label: "出願開始", date: schedule.applicationStart },
    { label: "出願締切", date: schedule.applicationEnd },
    { label: "試験日", date: schedule.examDate },
    { label: "合格発表", date: schedule.resultDate },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="size-4" />
          スケジュール
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ label, date }) => {
          const days = calcDaysLeft(date);
          return (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-3 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <div className="text-right">
                <p className="text-sm">{date}</p>
                <p className={`text-xs ${daysLeftColor(days)}`}>{daysLeftLabel(days)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface RequirementRowProps {
  label: string;
  met: boolean;
  detail: string;
}

function RequirementRow({ label, met, detail }: RequirementRowProps) {
  return (
    <div className="flex items-start gap-3">
      {met ? (
        <CheckCircle className="size-4 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function FacultyDetailPage({
  params,
}: {
  params: Promise<{ universityId: string; facultyId: string }>;
}) {
  const { universityId, facultyId } = use(params);
  const router = useRouter();
  const [university, setUniversity] = useState<University | null>(null);
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/universities/${universityId}`);
        if (!res.ok) throw new Error("大学情報の取得に失敗しました");
        const data: University = await res.json();
        setUniversity(data);
        const f = data.faculties.find((fac) => fac.id === facultyId);
        if (!f) throw new Error("学部が見つかりませんでした");
        setFaculty(f);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [universityId, facultyId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !university || !faculty) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-5 lg:py-8">
        <p className="text-destructive">{error ?? "データが見つかりませんでした"}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 lg:py-8 space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" />
          戻る
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <GraduationCap className="size-6 text-primary shrink-0 mt-1" />
        <div>
          <h1 className="text-lg lg:text-xl font-bold">{university.name}</h1>
          <p className="text-muted-foreground">{faculty.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            定員: {faculty.capacity}名
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">アドミッションポリシー</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{faculty.admissionPolicy}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">選考フロー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faculty.selectionMethods.map((method, index) => (
            <div key={method.stage}>
              <div className="flex items-start gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {method.stage}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={selectionTypeVariant(method.type)}>
                      {selectionTypeLabel(method.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{method.details}</p>
                </div>
              </div>
              {index < faculty.selectionMethods.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">出願要件チェック</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RequirementRow
            label={faculty.requirements.gpa ? `GPA ${faculty.requirements.gpa}以上` : "GPA要件"}
            met={!faculty.requirements.gpa}
            detail={
              faculty.requirements.gpa
                ? `GPA ${faculty.requirements.gpa} 以上が必要です`
                : "GPA要件なし"
            }
          />
          <RequirementRow
            label="英語資格"
            met={!faculty.requirements.englishCert}
            detail={faculty.requirements.englishCert ?? "英語資格要件なし"}
          />
          {faculty.requirements.otherReqs.map((req, i) => (
            <RequirementRow key={i} label="その他" met={false} detail={req} />
          ))}
        </CardContent>
      </Card>

      <ScheduleCard schedule={faculty.schedule} />
    </div>
  );
}
