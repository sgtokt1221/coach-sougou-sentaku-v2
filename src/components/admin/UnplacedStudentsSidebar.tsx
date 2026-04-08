"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GripVertical, CheckCircle } from "lucide-react";

interface UnplacedStudent {
  uid: string;
  displayName: string;
  targetUniversities: string[];
  latestScore: number | null;
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
  loading = false
}: UnplacedStudentsSidebarProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, student: UnplacedStudent) => {
    e.dataTransfer.setData("studentId", student.uid);
    e.dataTransfer.setData("studentName", student.displayName);
    e.dataTransfer.effectAllowed = "copy";
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">未配置</h3>
          <Skeleton className="w-6 h-5 rounded-full" />
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
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">未配置</h3>
          <Badge variant="secondary" className="text-xs">
            0
          </Badge>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle className="size-8 text-emerald-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium">全員配置済み</p>
            <p className="text-xs text-muted-foreground">
              今月のセッションが全て配置されています
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">未配置</h3>
        <Badge variant="destructive" className="text-xs">
          {students.length}
        </Badge>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-200px)] space-y-3">
        {students.map((student) => (
          <Card
            key={student.uid}
            className="p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-200 border-l-4 border-l-orange-400"
            draggable
            onDragStart={(e) => handleDragStart(e, student)}
          >
            <div className="space-y-2">
              {/* Student name and drag handle */}
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate">
                  {student.displayName}
                </span>
              </div>

              {/* Target universities */}
              {student.targetUniversities.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">志望校</p>
                  <div className="flex flex-wrap gap-1">
                    {student.targetUniversities.slice(0, 2).map((university, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        {university}
                      </Badge>
                    ))}
                    {student.targetUniversities.length > 2 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{student.targetUniversities.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Latest score */}
              {student.latestScore !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">最新スコア</span>
                  <Badge
                    variant={student.latestScore >= 70 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {student.latestScore}点
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}