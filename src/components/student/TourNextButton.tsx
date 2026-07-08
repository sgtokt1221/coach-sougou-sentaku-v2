// src/components/student/TourNextButton.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSWR } from "@/lib/api/swr";
import { getStation, tourHref } from "@/lib/logical-tour/stations";
import type { LogicalTourResponse } from "@/lib/types/logical-tour";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 各駅の結果画面に差し込む。?tour=1 の時だけ表示。 */
export function TourNextButton() {
  const search = useSearchParams();
  const inTour = search.get("tour") === "1";
  const { data } = useAuthSWR<LogicalTourResponse>(
    inTour ? `/api/student/logical-tour?date=${todayStr()}` : null,
  );
  if (!inTour || !data) return null;

  const nextKey = data.nextStationKey;
  if (nextKey) {
    const label = getStation(nextKey)?.label ?? "次の駅";
    return (
      <Link href={tourHref(nextKey)} className="block">
        <Button className="w-full gap-1">
          次の駅へ（{label}）<ArrowRight className="size-4" />
        </Button>
      </Link>
    );
  }
  return (
    <Link href="/student/dashboard" className="block">
      <Button className="w-full gap-1">ロジカルツアー完走！ ダッシュボードへ</Button>
    </Link>
  );
}
