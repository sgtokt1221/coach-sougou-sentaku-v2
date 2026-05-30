"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { University } from "@/lib/types/university";
import {
  GROUP_LABELS,
  GROUP_COLORS,
  GROUP_ORDER,
  PREFECTURES,
} from "@/lib/constants/university";

export interface PickerUniversity {
  universityId: string;
  facultyId: string;
  universityName: string;
  facultyName: string;
  group?: University["group"];
  prefecture?: string;
}

interface Props {
  items: PickerUniversity[];
  selectedCompoundId: string | null;
  onSelect: (compoundId: string) => void;
}

/**
 * アドミッションポリシー参照先（他大学）の検索・絞り込み選択UI。
 * 大学名/学部名の検索 + グループ + 都道府県でフィルタし、グループ別にセクション表示する。
 */
export function UniversityPicker({ items, selectedCompoundId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [pref, setPref] = useState<string>("all");

  // データに存在する都道府県のみ（PREFECTURES 順）
  const availablePrefs = useMemo(() => {
    const set = new Set(items.map((u) => u.prefecture).filter(Boolean) as string[]);
    return PREFECTURES.filter((p) => set.has(p));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((u) => {
      if (group !== "all" && u.group !== group) return false;
      if (pref !== "all" && u.prefecture !== pref) return false;
      if (q && !`${u.universityName}${u.facultyName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, query, group, pref]);

  // グループ別にまとめる
  const sections = useMemo(() => {
    const byGroup = new Map<string, PickerUniversity[]>();
    for (const u of filtered) {
      const g = u.group ?? "private";
      const arr = byGroup.get(g) ?? [];
      arr.push(u);
      byGroup.set(g, arr);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      items: byGroup.get(g)!,
    }));
  }, [filtered]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="大学名・学部名で検索..."
          className="h-9 pl-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Select value={group} onValueChange={(v) => setGroup(v ?? "all")}>
          <SelectTrigger className="h-9 flex-1 text-xs">
            <SelectValue placeholder="グループ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全グループ</SelectItem>
            {GROUP_ORDER.map((g) => (
              <SelectItem key={g} value={g}>
                {GROUP_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pref} onValueChange={(v) => setPref(v ?? "all")}>
          <SelectTrigger className="h-9 flex-1 text-xs">
            <SelectValue placeholder="都道府県" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全都道府県</SelectItem>
            {availablePrefs.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-lg border p-2">
        {sections.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            該当する大学・学部がありません
          </p>
        ) : (
          sections.map((sec) => (
            <div key={sec.group}>
              <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 ${GROUP_COLORS[sec.group as University["group"]]}`}
                >
                  {GROUP_LABELS[sec.group as University["group"]]}
                </span>
                <span>{sec.items.length}件</span>
              </p>
              <div className="space-y-1">
                {sec.items.map((u) => {
                  const cid = `${u.universityId}:${u.facultyId}`;
                  const on = selectedCompoundId === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => onSelect(cid)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm transition-colors ${
                        on ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{u.universityName}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {u.facultyName}
                        </span>
                      </span>
                      {u.prefecture && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {u.prefecture}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
