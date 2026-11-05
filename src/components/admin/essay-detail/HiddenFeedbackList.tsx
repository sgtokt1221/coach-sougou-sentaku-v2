"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TeacherHiddenItem } from "@/lib/types/essay";

/** 先生が外した指摘の一覧。1件ずつ元に戻せる */
export function HiddenFeedbackList({
  items,
  onRestore,
}: {
  items: TeacherHiddenItem[];
  onRestore: (item: TeacherHiddenItem) => void;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="bg-muted rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <span>
          外した指摘 <b>{items.length}件</b>
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid gap-2 px-4 pb-4">
          {items.map((h) => (
            <div
              key={`${h.key}|${h.text}`}
              className="bg-background flex items-start justify-between gap-3 rounded-lg px-3 py-2"
            >
              <p className="text-muted-foreground text-sm leading-relaxed line-through">
                {h.text}
              </p>
              <button
                type="button"
                onClick={() => onRestore(h)}
                className="shrink-0 text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                元に戻す
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
