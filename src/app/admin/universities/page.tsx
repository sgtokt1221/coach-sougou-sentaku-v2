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
import { GROUP_LABELS, GROUP_COLORS, GROUP_ORDER } from "@/lib/constants/university";
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

export default function AdminUniversitiesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const canEdit = userProfile?.role === "superadmin";
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  // グループ別セクション（GROUP_ORDER 順、空グループは非表示）
  const sections = GROUP_ORDER.map((g) => ({
    group: g,
    items: universities.filter((u) => u.group === g),
  })).filter((s) => s.items.length > 0);

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
                {search
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
                  {sections.map((sec) => (
                    <Fragment key={sec.group}>
                      <tr className="border-b bg-muted/40">
                        <td
                          colSpan={7}
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
