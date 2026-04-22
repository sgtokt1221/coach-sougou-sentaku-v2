"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Building2, GraduationCap, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/api/client";
import type { University } from "@/lib/types/university";
import { SelectionTypeBadge } from "@/components/shared/SelectionTypeBadge";

type Group = University["group"] | "all";

const GROUP_LABELS: Record<University["group"], string> = {
  kyutei: "旧帝大",
  soukeijochi: "早慶上智",
  march: "MARCH",
  kankandouritsu: "関関同立",
  sankinkohryu: "産近甲龍",
  nittoukomasen: "日東駒専",
  seiseimeidoku: "成成明獨國武",
  national: "国立大学",
  public: "公立大学",
  private: "その他私立",
};

const GROUP_COLORS: Record<University["group"], string> = {
  kyutei: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  soukeijochi: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  march: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  kankandouritsu: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sankinkohryu: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  nittoukomasen: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  seiseimeidoku: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  national: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  public: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  private: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function GroupBadge({ group }: { group: University["group"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${GROUP_COLORS[group]}`}
    >
      {GROUP_LABELS[group]}
    </span>
  );
}

export default function AdminUniversitiesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const canEdit = userProfile?.role === "superadmin";
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<Group>("all");

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

  const filtered =
    groupFilter === "all"
      ? universities
      : universities.filter((u) => u.group === groupFilter);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">大学一覧</h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? "大学・学部情報の管理と編集ができます" : "大学・学部情報を閲覧できます"}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="大学名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={groupFilter}
          onValueChange={(v) => setGroupFilter(v as Group)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="グループで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {(Object.keys(GROUP_LABELS) as University["group"][]).map((key) => (
              <SelectItem key={key} value={key}>
                {GROUP_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Building2 className="size-8" />
              <p className="text-sm">
                {search || groupFilter !== "all"
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
                  {filtered.map((u) => (
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
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
