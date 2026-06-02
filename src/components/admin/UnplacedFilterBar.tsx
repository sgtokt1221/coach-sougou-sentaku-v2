"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDisplayGrade } from "@/lib/utils/grade";

/** 絞り込み対象の生徒が持つべきフィールド */
export interface FilterableStudent {
  grade?: number | null;
  gradeUpdatedAt?: string | null;
  isRonin?: boolean;
  school?: string | null;
  targetUniversities: string[];
}

export interface UnplacedFilterValue {
  /** 学年ラベル（高1/高2/... or "all"） */
  grade: string;
  /** 高校名 or "all" */
  school: string;
  /** 志望大学ID or "all" */
  universityId: string;
}

export const EMPTY_FILTER: UnplacedFilterValue = {
  grade: "all",
  school: "all",
  universityId: "all",
};

/** value に基づいて生徒配列を絞り込む（複数条件は AND） */
export function applyUnplacedFilters<T extends FilterableStudent>(
  students: T[],
  value: UnplacedFilterValue,
): T[] {
  return students.filter((s) => {
    if (value.grade !== "all") {
      const label = getDisplayGrade(s.grade ?? undefined, s.gradeUpdatedAt ?? undefined, s.isRonin).label;
      if (label !== value.grade) return false;
    }
    if (value.school !== "all" && (s.school ?? "") !== value.school) return false;
    if (
      value.universityId !== "all" &&
      !s.targetUniversities.some((t) => t.split(":")[0] === value.universityId)
    ) {
      return false;
    }
    return true;
  });
}

// 学年ラベルの並び順
const GRADE_ORDER = ["高1", "高2", "高3", "浪人", "卒業生", "未設定"];

interface UnplacedFilterBarProps {
  students: FilterableStudent[];
  value: UnplacedFilterValue;
  onChange: (v: UnplacedFilterValue) => void;
}

/**
 * 未配置パネル用の絞り込みバー（学年・高校・志望校〔大学単位〕）。
 * 志望校のラベルは /api/universities/resolve で大学名に解決する。
 */
export default function UnplacedFilterBar({ students, value, onChange }: UnplacedFilterBarProps) {
  // 学年の選択肢
  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      set.add(getDisplayGrade(s.grade ?? undefined, s.gradeUpdatedAt ?? undefined, s.isRonin).label);
    }
    return Array.from(set).sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
  }, [students]);

  // 高校の選択肢
  const schoolOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.school) set.add(s.school);
    }
    return Array.from(set).sort();
  }, [students]);

  // 志望大学ID（distinct）
  const universityIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      for (const t of s.targetUniversities) {
        const id = t.split(":")[0];
        if (id) set.add(id);
      }
    }
    return Array.from(set);
  }, [students]);

  // 大学ID→大学名 解決
  const [uniNames, setUniNames] = useState<Record<string, string>>({});
  const compoundKey = useMemo(
    () =>
      Array.from(
        new Set(students.flatMap((s) => s.targetUniversities)),
      ).join(","),
    [students],
  );
  useEffect(() => {
    if (!compoundKey) return;
    fetch(`/api/universities/resolve?ids=${encodeURIComponent(compoundKey)}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {};
        for (const r of d.resolved ?? []) map[r.universityId] = r.universityName;
        setUniNames(map);
      })
      .catch(() => {
        /* 失敗時は ID フォールバック */
      });
  }, [compoundKey]);

  const set = (patch: Partial<UnplacedFilterValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2">
      <Select value={value.grade} onValueChange={(v) => set({ grade: v || "all" })}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="学年" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">学年（すべて）</SelectItem>
          {gradeOptions.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.school} onValueChange={(v) => set({ school: v || "all" })}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="高校" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">高校（すべて）</SelectItem>
          {schoolOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.universityId} onValueChange={(v) => set({ universityId: v || "all" })}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="志望校" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">志望校（すべて）</SelectItem>
          {universityIds.map((id) => (
            <SelectItem key={id} value={id}>
              {uniNames[id] ?? id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
