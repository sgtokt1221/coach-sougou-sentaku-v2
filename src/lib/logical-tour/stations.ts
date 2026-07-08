// src/lib/logical-tour/stations.ts
import type { TourStation, TourStationKey } from "@/lib/types/logical-tour";

export const TOUR_STATIONS: TourStation[] = [
  { key: "choco", label: "ちょこ添削", href: "/student/essay/choco", collection: "chokoReviews", dateField: "createdAt", dateType: "isoString", estMinutes: 10, order: 1 },
  { key: "summary", label: "要約ドリル", href: "/student/essay/summary-drill", collection: "summaryDrills", dateField: "completedAt", dateType: "timestamp", estMinutes: 10, order: 2 },
  { key: "logic", label: "論理ドリル", href: "/student/essay/logic-drill", collection: "logicDrills", dateField: "completedAt", dateType: "timestamp", estMinutes: 15, order: 3 },
];

export function getStation(key: TourStationKey): TourStation | undefined {
  return TOUR_STATIONS.find((s) => s.key === key);
}

/** 駅の導線URLに ?tour=1 を付ける */
export function tourHref(key: TourStationKey): string {
  const s = getStation(key);
  if (!s) return "/student/dashboard";
  return `${s.href}?tour=1`;
}
