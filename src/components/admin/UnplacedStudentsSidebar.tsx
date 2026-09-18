"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GripVertical, CheckCircle } from "lucide-react";
import UnplacedFilterBar, {
  applyUnplacedFilters,
  EMPTY_FILTER,
  type UnplacedFilterValue,
} from "@/components/admin/UnplacedFilterBar";

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
  grade?: number | null;
  gradeUpdatedAt?: string | null;
  isRonin?: boolean;
  school?: string | null;
}

interface UnplacedStudentsSidebarProps {
  students: UnplacedStudent[];
  loading?: boolean;
}

/**
 * 未配置生徒のサイドバー
 * 今月1:1セッションが配置されていない生徒をドラッグ可能なカードで表示
 */
export default function UnplacedStudentsSidebar({
  students,
  loading = false,
}: UnplacedStudentsSidebarProps) {
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    student: UnplacedStudent
  ) => {
    e.dataTransfer.setData("studentId", student.uid);
    e.dataTransfer.setData("studentName", student.displayName);
    e.dataTransfer.effectAllowed = "copy";
  };

  // 志望校の複合ID（"uniId:facId"）を日本語名（"大学名 学部名"）に解決
  const compoundIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      for (const u of s.targetUniversities) set.add(u);
    }
    return Array.from(set);
  }, [students]);

  const [filter, setFilter] = useState<UnplacedFilterValue>(EMPTY_FILTER);
  const filtered = useMemo(
    () => applyUnplacedFilters(students, filter),
    [students, filter]
  );

  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const idsKey = compoundIds.join(",");
  useEffect(() => {
    if (compoundIds.length === 0) return;
    fetch(`/api/universities/resolve?ids=${encodeURIComponent(idsKey)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const r of d.resolved ?? []) {
          map[`${r.universityId}:${r.facultyId}`] =
            `${r.universityName} ${r.facultyName}`;
        }
        setNameMap(map);
      })
      .catch(() => {
        /* 解決失敗時は生IDをフォールバック表示 */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">未配置</h3>
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">未配置</h3>
          <Badge variant="secondary" className="text-xs">
            0
          </Badge>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle className="size-8 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium">全員配置済み</p>
            <p className="text-muted-foreground text-xs">
              今月のセッションが全て配置されています
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">未配置</h3>
        <Badge variant="destructive" className="text-xs">
          {filtered.length}
        </Badge>
      </div>

      <UnplacedFilterBar
        students={students}
        value={filter}
        onChange={setFilter}
      />

      <div className="max-h-[calc(100vh-280px)] space-y-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-4 text-xs">
            該当する生徒がいません
          </p>
        ) : (
          filtered.map((student, index) => (
            <Card
              key={`${student.uid}-${index}`}
              // 未配置であることは見出しと配置先の空欄で分かる。左色帯は使わない
              className="cursor-grab p-3 transition-all duration-200 hover:shadow-sm active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, student)}
            >
              <div className="space-y-2">
                {/* Student name and drag handle */}
                <div className="flex items-center gap-2">
                  <GripVertical className="text-muted-foreground size-4 flex-shrink-0" />
                  <span className="truncate text-sm font-medium">
                    {student.displayName}
                  </span>
                </div>

                {/* Target universities */}
                {student.targetUniversities.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">志望校</p>
                    <div className="flex flex-wrap gap-1">
                      {student.targetUniversities
                        .slice(0, 2)
                        .map((university, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-muted-foreground text-xs"
                          >
                            {nameMap[university] ?? university}
                          </Badge>
                        ))}
                      {student.targetUniversities.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground text-xs"
                        >
                          +{student.targetUniversities.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Latest score */}
                {student.latestScore !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      最新スコア
                    </span>
                    <Badge
                      variant={
                        student.latestScore >= 70 ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {student.latestScore}点
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
