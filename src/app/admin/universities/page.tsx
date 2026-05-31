"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Building2, GraduationCap, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { University } from "@/lib/types/university";
import {
  GROUP_LABELS,
  GROUP_COLORS,
  GROUP_ORDER,
  REGIONS,
  PREFECTURE_TO_REGION,
  DEVIATION_BANDS,
  PREFECTURES,
} from "@/lib/constants/university";
import { getUniversityDeviation } from "@/lib/data/university-deviations";
import { SelectionTypeBadge } from "@/components/shared/SelectionTypeBadge";

function GroupBadge({ group }: { group: University["group"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${GROUP_COLORS[group]}`}
    >
      {GROUP_LABELS[group]}
    </span>
  );
}

/** ボタン式の単一選択フィルタ行 */
function PillRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value === o.id
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 大学の偏差値レンジ表示（例: 50.0–57.5 / データ無しは -） */
function deviationLabel(id: string): string {
  const d = getUniversityDeviation(id);
  if (!d) return "-";
  return d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
}

export default function AdminUniversitiesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const canEdit = userProfile?.role === "superadmin";
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // ボタン絞り込み（各単一選択・既定 "all"）
  const [region, setRegion] = useState("all");
  const [prefecture, setPrefecture] = useState("all");
  const [group, setGroup] = useState("all");
  const [band, setBand] = useState("all");

  useEffect(() => {
    async function fetchUniversities() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await authFetch(`/api/admin/universities?${params.toString()}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setUniversities(Array.isArray(data.universities) ? data.universities : []);
      } catch {
        setUniversities([]);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(fetchUniversities, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ボタン絞り込み（地域/都道府県/グループ/偏差値）を AND で適用
  const filtered = universities.filter((u) => {
    if (region !== "all" && PREFECTURE_TO_REGION[u.prefecture] !== region) return false;
    if (prefecture !== "all" && u.prefecture !== prefecture) return false;
    if (group !== "all" && u.group !== group) return false;
    if (band !== "all") {
      const d = getUniversityDeviation(u.id);
      if (!d) return false;
      const bd = DEVIATION_BANDS.find((b) => b.id === band);
      if (!bd || !bd.test(d.max)) return false;
    }
    return true;
  });

  // 都道府県ボタン候補（データに存在する県のみ。地域選択時はその地域の県のみ）
  const availablePrefectures = PREFECTURES.filter((p) =>
    universities.some(
      (u) => u.prefecture === p && (region === "all" || PREFECTURE_TO_REGION[p] === region),
    ),
  );
  // データに存在するグループのみ
  const availableGroups = GROUP_ORDER.filter((g) => universities.some((u) => u.group === g));

  // グループ別セクション（GROUP_ORDER 順、空グループは非表示）
  const sections = GROUP_ORDER.map((g) => ({
    group: g,
    items: filtered.filter((u) => u.group === g),
  })).filter((s) => s.items.length > 0);

  /** 地域変更時は都道府県選択をリセット */
  function handleRegion(v: string) {
    setRegion(v);
    setPrefecture("all");
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">大学一覧</h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? "大学・学部情報の管理と編集ができます" : "大学・学部情報を閲覧できます"}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="大学名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* ボタン絞り込み */}
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <PillRow
          label="地域"
          value={region}
          onChange={handleRegion}
          options={[{ id: "all", label: "すべて" }, ...REGIONS.map((r) => ({ id: r, label: r }))]}
        />
        {availablePrefectures.length > 0 && (
          <PillRow
            label="都道府県"
            value={prefecture}
            onChange={setPrefecture}
            options={[
              { id: "all", label: "すべて" },
              ...availablePrefectures.map((p) => ({ id: p, label: p })),
            ]}
          />
        )}
        <PillRow
          label="グループ"
          value={group}
          onChange={setGroup}
          options={[
            { id: "all", label: "すべて" },
            ...availableGroups.map((g) => ({ id: g, label: GROUP_LABELS[g] })),
          ]}
        />
        <PillRow
          label="偏差値"
          value={band}
          onChange={setBand}
          options={[
            { id: "all", label: "すべて" },
            ...DEVIATION_BANDS.map((b) => ({ id: b.id, label: b.label })),
          ]}
        />
        <p className="pl-14 text-[10px] text-muted-foreground">
          偏差値の出典: 河合塾 Kei-Net 2026（大学の最大偏差値でバンド判定）
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Building2 className="size-8" />
              <p className="text-sm">
                {search || region !== "all" || prefecture !== "all" || group !== "all" || band !== "all"
                  ? "該当する大学が見つかりません"
                  : "大学がまだ登録されていません"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">大学名</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                      略称
                    </th>
                    <th className="px-4 py-3 text-left font-medium">グループ</th>
                    <th className="px-4 py-3 text-center font-medium">偏差値</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                      選抜種別
                    </th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">
                      学部数
                    </th>
                    <th className="px-4 py-3 text-center font-medium hidden md:table-cell">
                      最終更新
                    </th>
                    <th className="px-4 py-3 text-center font-medium w-16">
                      リンク
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec) => (
                    <Fragment key={sec.group}>
                      <tr className="border-b bg-muted/40">
                        <td
                          colSpan={8}
                          className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                        >
                          {GROUP_LABELS[sec.group]}（{sec.items.length}校）
                        </td>
                      </tr>
                      {sec.items.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-b transition-colors hover:bg-accent"
                      onClick={() => router.push(`/admin/universities/${u.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="size-4 text-muted-foreground" />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {u.shortName}
                      </td>
                      <td className="px-4 py-3">
                        <GroupBadge group={u.group} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const label = deviationLabel(u.id);
                          return label === "-" ? (
                            <span className="text-muted-foreground/40">-</span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-600 dark:text-sky-300">
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(() => {
                          const types = new Set(
                            u.faculties.map((f) => f.selectionType).filter(Boolean) as string[]
                          );
                          if (types.size === 0) return <span className="text-xs text-muted-foreground/50">-</span>;
                          return (
                            <div className="flex flex-wrap gap-1">
                              {types.has("comprehensive") && <SelectionTypeBadge type="comprehensive" size="sm" />}
                              {types.has("school_recommendation") && <SelectionTypeBadge type="school_recommendation" size="sm" />}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {u.faculties.length}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell text-xs text-muted-foreground">
                        {u.updatedAt
                          ? new Date(u.updatedAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const admUrl = u.faculties?.[0]?.admissionUrl;
                          const url = admUrl || u.officialUrl;
                          if (!url) return <span className="text-muted-foreground/30">-</span>;
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                              title={admUrl ? "総合型選抜ページ" : "大学公式サイト"}
                            >
                              <ExternalLink className="size-3.5" />
                              {admUrl ? "入試" : "公式"}
                            </a>
                          );
                        })()}
                      </td>
                    </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
