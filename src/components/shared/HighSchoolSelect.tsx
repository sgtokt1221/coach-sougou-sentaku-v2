"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HighSchool } from "@/lib/types/high-school";

const KIND_LABEL: Record<NonNullable<HighSchool["kind"]>, string> = {
  public: "公立",
  private: "私立",
  national: "国立",
};

export interface HighSchoolValue {
  /** マスタと紐付いた高校 ID。自由入力時は null */
  schoolId: string | null;
  /** 表示・保存する高校名（自由入力も可） */
  schoolName: string;
}

interface HighSchoolSelectProps {
  value: HighSchoolValue;
  onChange: (v: HighSchoolValue) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * 出身高校の選択式入力。`/api/high-schools`（近畿圏マスタ）から候補を取得し、
 * 名前/府県で部分一致検索→選択で schoolId を確定する。
 * 一覧に無い高校は自由入力でき、その場合 schoolId=null（名前のみ保存）。
 */
export function HighSchoolSelect({
  value,
  onChange,
  placeholder,
  id,
  className,
}: HighSchoolSelectProps) {
  const [all, setAll] = useState<HighSchool[]>([]);
  const [text, setText] = useState(value.schoolName ?? "");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 外部からの value 更新（編集プリフィル等）に追従
  useEffect(() => {
    setText(value.schoolName ?? "");
  }, [value.schoolName]);

  // マスタ取得（1 回）
  useEffect(() => {
    let active = true;
    fetch("/api/high-schools")
      .then((r) => r.json())
      .then((d) => {
        if (active) setAll(d.highSchools ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim();
    const list = q
      ? all.filter((s) => s.name.includes(q) || s.prefecture.includes(q))
      : all;
    return list.slice(0, 30);
  }, [all, text]);

  /** 入力（自由入力）: 選択確定するまで schoolId は null */
  function handleType(v: string) {
    setText(v);
    setOpen(true);
    onChange({ schoolId: null, schoolName: v });
  }

  /** 候補選択: マスタと紐付け */
  function pick(s: HighSchool) {
    setText(s.name);
    onChange({ schoolId: s.id, schoolName: s.name });
    setOpen(false);
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={text}
        placeholder={placeholder ?? "高校名を検索（例: 北野）"}
        autoComplete="off"
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{s.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>
                    {s.prefecture}
                    {s.kind ? ` ・ ${KIND_LABEL[s.kind]}` : ""}
                  </span>
                  {typeof s.deviation === "number" && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      偏差値 {s.deviation}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.schoolId && (
        <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
          マスタと紐付け済み
        </p>
      )}
    </div>
  );
}
