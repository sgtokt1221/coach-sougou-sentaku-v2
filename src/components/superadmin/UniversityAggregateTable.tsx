"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UniversityAggregate } from "@/lib/types/superadmin-analytics";

interface Props {
  aggregates: UniversityAggregate[];
  totalStudents: number;
}

export function UniversityAggregateTable({ aggregates, totalStudents }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [groupByUniversity, setGroupByUniversity] = useState(false);

  const rows = useMemo(() => {
    if (!groupByUniversity) return aggregates;
    // 大学単位で集約: unique uid 数をカウント
    const byUni = new Map<
      string,
      {
        universityId: string;
        universityName: string;
        facultyCount: number;
        studentCount: number;
        uniqueStudents: Map<string, UniversityAggregate["students"][number]>;
      }
    >();
    for (const a of aggregates) {
      if (!byUni.has(a.universityId)) {
        byUni.set(a.universityId, {
          universityId: a.universityId,
          universityName: a.universityName,
          facultyCount: 0,
          studentCount: 0,
          uniqueStudents: new Map(),
        });
      }
      const entry = byUni.get(a.universityId)!;
      entry.facultyCount += 1;
      for (const s of a.students) {
        entry.uniqueStudents.set(s.uid, s);
      }
    }
    return Array.from(byUni.values())
      .map((e) => ({
        universityId: e.universityId,
        facultyId: "",
        universityName: e.universityName,
        facultyName: `${e.facultyCount} 学部`,
        studentCount: e.uniqueStudents.size,
        students: Array.from(e.uniqueStudents.values()).slice(0, 30),
      }))
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [aggregates, groupByUniversity]);

  const maxCount = rows[0]?.studentCount ?? 1;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        まだ志望校が登録されている生徒がいません。
      </div>
    );
  }

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          志望校登録者: 全 <strong className="text-foreground">{totalStudents}</strong> 名
        </p>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={groupByUniversity}
            onChange={(e) => setGroupByUniversity(e.target.checked)}
            className="cursor-pointer"
          />
          大学単位でまとめる
        </label>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs">
              <th className="px-3 py-2 text-left font-medium w-12">順位</th>
              <th className="px-3 py-2 text-left font-medium">大学・学部</th>
              <th className="px-3 py-2 text-right font-medium w-24">生徒数</th>
              <th className="px-3 py-2 w-48 text-left font-medium">分布</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const key = `${row.universityId}:${row.facultyId}`;
              const isOpen = expanded.has(key);
              const barPct = Math.round((row.studentCount / maxCount) * 100);
              return (
                <>
                  <tr
                    key={key}
                    className="border-b cursor-pointer hover:bg-muted/40"
                    onClick={() => toggle(key)}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.universityName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.facultyName}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-bold">{row.studentCount}</span>
                      <span className="text-muted-foreground"> 名</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-teal-500 transition-all"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${key}-detail`}>
                      <td colSpan={5} className="bg-muted/20 px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.students.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              生徒情報がありません
                            </span>
                          ) : (
                            row.students.map((s) => (
                              <Link
                                key={s.uid}
                                href={`/superadmin/students/${s.uid}`}
                                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {s.displayName}
                              </Link>
                            ))
                          )}
                          {row.studentCount > row.students.length && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{row.studentCount - row.students.length} 名
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
