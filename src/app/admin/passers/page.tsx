"use client";

import Link from "next/link";
import { Trophy, FileText, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/api/swr";
import { ApiErrorBanner } from "@/components/admin/ApiErrorBanner";
import type { PasserPass } from "@/lib/passers/passer-access";

interface PasserRow {
  uid: string;
  name: string | null;
  label: string;
  passes: PasserPass[];
  essayCount: number;
  documentCount: number;
}

export default function PassersPage() {
  const { data, isLoading, error } = useAuthSWR<{ passers: PasserRow[] }>(
    "/api/admin/passers"
  );
  const passers = data?.passers ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Trophy className="size-6 text-amber-500" />
        合格者答案
      </h1>

      {error && <ApiErrorBanner error={error} />}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : passers.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          合格者はまだいません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {passers.map((p) => (
            <Link
              key={p.uid}
              href={`/admin/passers/${p.uid}`}
              className="bg-muted/60 hover:bg-muted block rounded-xl p-4 transition-colors"
            >
              <p className="text-lg font-bold">{p.name ?? p.label}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.passes.map((x, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                  >
                    {x.universityName}
                    {x.facultyName ? ` ${x.facultyName}` : ""}
                  </span>
                ))}
              </div>
              <div className="text-muted-foreground mt-3 flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-4" />
                  小論文 {p.essayCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FolderOpen className="size-4" />
                  書類 {p.documentCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
