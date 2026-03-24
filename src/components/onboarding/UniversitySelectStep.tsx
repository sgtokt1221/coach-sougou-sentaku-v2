"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronDown, ChevronUp, Check, FileText, Users, ClipboardList } from "lucide-react";
import type { University } from "@/lib/types/university";

const SELECTION_TYPE_LABELS: Record<string, string> = {
  documents: "書類審査",
  essay: "小論文",
  interview: "面接",
  presentation: "プレゼン",
  test: "筆記試験",
  other: "その他",
};

const GROUP_TABS = [
  { key: "all", label: "すべて" },
  { key: "kyutei", label: "旧帝大" },
  { key: "soukeijochi", label: "早慶上智" },
  { key: "kankandouritsu", label: "関関同立" },
  { key: "march", label: "MARCH" },
  { key: "sankinkohryu", label: "産近甲龍" },
] as const;

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function UniversitySelectStep({ selected, onChange }: Props) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedUni, setExpandedUni] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUniversities() {
      try {
        const res = await fetch("/api/universities");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUniversities(data.universities ?? []);
      } catch {
        setUniversities([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUniversities();
  }, []);

  const filtered = useMemo(() => {
    let list = universities;
    if (activeGroup !== "all") {
      list = list.filter((u) => u.group === activeGroup);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.shortName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [universities, activeGroup, search]);

  const toggleFaculty = (universityId: string, facultyId: string) => {
    const compoundId = `${universityId}:${facultyId}`;
    if (selected.includes(compoundId)) {
      onChange(selected.filter((s) => s !== compoundId));
    } else {
      onChange([...selected, compoundId]);
    }
  };

  const removeSelection = (compoundId: string) => {
    onChange(selected.filter((s) => s !== compoundId));
  };

  const getDisplayName = (compoundId: string) => {
    const [uniId, facId] = compoundId.split(":");
    const uni = universities.find((u) => u.id === uniId);
    const fac = uni?.faculties.find((f) => f.id === facId);
    return uni && fac ? `${uni.shortName} ${fac.name}` : compoundId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1">
              {getDisplayName(id)}
              <button
                type="button"
                onClick={() => removeSelection(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Group tabs */}
      <div className="flex flex-wrap gap-1.5">
        {GROUP_TABS.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={activeGroup === tab.key ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setActiveGroup(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="大学名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* University list */}
      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
        {filtered.map((uni) => {
          const isExpanded = expandedUni === uni.id;
          const selectedCount = selected.filter((s) =>
            s.startsWith(uni.id + ":")
          ).length;

          return (
            <div key={uni.id} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedUni(isExpanded ? null : uni.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{uni.name}</span>
                  {selectedCount > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      {selectedCount}
                    </Badge>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t px-3 py-2 space-y-2">
                  {uni.faculties.map((fac) => {
                    const compoundId = `${uni.id}:${fac.id}`;
                    const isSelected = selected.includes(compoundId);

                    return (
                      <div
                        key={fac.id}
                        className={`rounded-lg border transition-colors ${
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm"
                          onClick={() => toggleFaculty(uni.id, fac.id)}
                        >
                          <div
                            className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {isSelected && <Check className="size-3" />}
                          </div>
                          <span className="font-medium">{fac.name}</span>
                          {fac.capacity > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              定員{fac.capacity}名
                            </span>
                          )}
                        </button>

                        <div className="px-3 pb-3 space-y-2">
                          {fac.admissionPolicy && (
                            <div className="flex gap-2 text-xs">
                              <FileText className="size-3.5 shrink-0 mt-0.5 text-primary/70" />
                              <div>
                                <span className="font-medium text-primary/80">AP（求める学生像）</span>
                                <p className="text-muted-foreground mt-0.5">
                                  {fac.admissionPolicy}
                                </p>
                              </div>
                            </div>
                          )}

                          {fac.selectionMethods.length > 0 && (
                            <div className="flex gap-2 text-xs">
                              <ClipboardList className="size-3.5 shrink-0 mt-0.5 text-primary/70" />
                              <div>
                                <span className="font-medium text-primary/80">選考方法</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {fac.selectionMethods
                                    .sort((a, b) => a.stage - b.stage)
                                    .map((m, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] font-normal py-0">
                                        {m.stage > 0 && `${m.stage}次: `}
                                        {SELECTION_TYPE_LABELS[m.type] ?? m.type}
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {(fac.requirements.gpa || fac.requirements.englishCert || fac.requirements.otherReqs.length > 0) && (
                            <div className="flex gap-2 text-xs">
                              <Users className="size-3.5 shrink-0 mt-0.5 text-primary/70" />
                              <div>
                                <span className="font-medium text-primary/80">出願要件</span>
                                <div className="flex flex-wrap gap-1.5 mt-1 text-muted-foreground">
                                  {fac.requirements.gpa && (
                                    <span>GPA {fac.requirements.gpa}以上</span>
                                  )}
                                  {fac.requirements.englishCert && (
                                    <span>{fac.requirements.englishCert}</span>
                                  )}
                                  {fac.requirements.otherReqs.map((req, i) => (
                                    <span key={i}>{req}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            該当する大学が見つかりません
          </p>
        )}
      </div>
    </div>
  );
}
